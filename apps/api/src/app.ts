import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { randomUUID } from 'node:crypto'
import { AIProviderError, answerQuestion, type AIProvider } from '@ods-ai/ai-core'
import { createRateLimiter, type RateLimitConfig } from './rateLimit'

/**
 * apps/api (ADR-005, F7 §7–§10).
 *
 * A deliberately thin HTTP layer over AI Core: it validates the request, calls
 * `answerQuestion` and returns the structured AIAnswer. It contains NO
 * retrieval, NO prompt building and NO model knowledge — those live in
 * knowledge/ai-core. The provider is injected (tests use MockProvider; the
 * node entrypoint picks one from the environment).
 */

/** Maximum question length (chars). Documented limit; SPEC §7 message limit. */
export const MAX_QUESTION_LENGTH = 4000

/** Maximum request body size (bytes). V1-0 (P0-2): evita abuso de memoria. */
export const MAX_BODY_BYTES = 64 * 1024

export interface AppDeps {
  provider: AIProvider
  /** Injectable for tests; defaults to AI Core defaults. */
  minScore?: number
  topK?: number
  /** Rate limiting por IP (en memoria). Si se omite, no se aplica. */
  rateLimit?: RateLimitConfig
  /**
   * Orígenes permitidos por CORS (V1 FINAL, FASE 2).
   * - undefined → dev default: `*` (API pública sin credenciales).
   * - lista → producción: solo esos orígenes; cualquier otro origen recibe
   *   preflight 204 sin `Access-Control-Allow-Origin` (el navegador bloquea)
   *   o 403 en peticiones reales. Peticiones sin header `Origin` (curl,
   *   server-to-server) no se ven afectadas.
   */
  corsOrigins?: string[]
  /**
   * Si es true, la IP se toma de `X-Forwarded-For` (solo seguro detrás de un
   * proxy de confianza que sobrescribe esa cabecera). Si es false (default),
   * la cabecera NO se confía: se usa la dirección del socket — evita que un
   * atacante falsifique `X-Forwarded-For` para saltarse el rate limit.
   */
  trustProxy?: boolean
}

export function createApp({
  provider,
  minScore,
  topK,
  rateLimit,
  corsOrigins,
  trustProxy,
}: AppDeps) {
  const limiter = rateLimit !== undefined ? createRateLimiter(rateLimit) : undefined
  const app = new Hono()

  // CORS (V1 FINAL, FASE 2). apps/docs consume /api/ask desde otro origen
  // (dev 5173 → 3001, e2e 6007 → 3001, producción en el dominio público de
  // docs). API pública sin credenciales ni cookies.
  app.use('*', async (c, next) => {
    const origin = c.req.header('origin')
    if (corsOrigins !== undefined && origin !== undefined) {
      // Producción: lista cerrada de orígenes.
      if (!corsOrigins.includes(origin)) {
        if (c.req.method === 'OPTIONS') return c.body(null, 204)
        return c.json(
          {
            error: {
              code: 'origin_not_allowed',
              message: 'Origin not allowed.',
              requestId: randomUUID(),
            },
          },
          403,
        )
      }
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Vary', 'Origin')
    } else if (corsOrigins === undefined) {
      // Dev default: cualquier origen, sin credenciales.
      c.header('Access-Control-Allow-Origin', '*')
    }
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type')
    c.header('Access-Control-Max-Age', '86400')
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
  })

  app.get('/api/health', (c) => {
    // Never exposes the API key or provider configuration.
    return c.json({ status: 'ok', provider: provider.id })
  })

  app.post(
    '/api/ask',
    // 0. Seguridad básica de entrada (V1-0, P0-2).
    //    b) Límite de tamaño del body: se aplica DURANTE la lectura del
    //       stream (no confiamos en Content-Length: los proxies y el fetch de
    //       Node no siempre lo exponen en los headers).
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: {
              code: 'payload_too_large',
              message: `Request body must not exceed ${MAX_BODY_BYTES} bytes.`,
              requestId: randomUUID(),
            },
          },
          413,
        ),
    }),
    async (c) => {
      const requestId = randomUUID()

      //    a) Rate limit por IP antes de parsear (health queda exento: es
      //       barato y lo consume la UI del asistente). La IP solo se toma de
      //       X-Forwarded-For si TRUST_PROXY está activo (ver clientIp).
      const ip = clientIp(c, trustProxy ?? false)
      if (limiter !== undefined) {
        const result = limiter.check(ip)
        if (!result.allowed) {
          c.header('Retry-After', String(Math.ceil((result.retryAfterMs ?? 0) / 1000)))
          return c.json(
            { error: { code: 'rate_limit', message: 'Too many requests.', requestId } },
            429,
          )
        }
      }

      // 1. Parse and validate (F7 §8) — safe, no internal details leaked.
      let question: unknown
      try {
        const body = await c.req.json<unknown>()
        question = (body as { question?: unknown })?.question
      } catch {
        return c.json(
          {
            error: {
              code: 'invalid_request',
              message: 'Request body must be valid JSON.',
              requestId,
            },
          },
          400,
        )
      }

      if (typeof question !== 'string') {
        return c.json(
          {
            error: { code: 'invalid_request', message: '"question" must be a string.', requestId },
          },
          400,
        )
      }
      const trimmed = question.trim()
      if (trimmed === '') {
        return c.json(
          {
            error: { code: 'invalid_request', message: '"question" must not be empty.', requestId },
          },
          400,
        )
      }
      if (trimmed.length > MAX_QUESTION_LENGTH) {
        return c.json(
          {
            error: {
              code: 'invalid_request',
              message: `"question" must not exceed ${MAX_QUESTION_LENGTH} characters.`,
              requestId,
            },
          },
          400,
        )
      }

      // 2. AI Core does retrieval → gate → context → prompt → provider → AIAnswer.
      //    The API never touches those internals (F7 §14).
      try {
        const answer = await answerQuestion({
          provider,
          question: trimmed,
          options: {
            ...(minScore !== undefined ? { minScore } : {}),
            ...(topK !== undefined ? { topK } : {}),
          },
        })
        // The AIAnswer IS the response contract (F7 §7) — no field-by-field
        // reconstruction. Refusals pass through unchanged (confidence "none",
        // referencedComponents []).
        return c.json({ requestId, ...answer })
      } catch (error) {
        return mapError(c, error, requestId)
      }
    },
  )

  return app
}

/**
 * Maps errors to safe HTTP responses (F7 §9). AIProviderError (from AI Core)
 * is mapped to provider-oriented statuses; anything else is an unexpected
 * internal error. Internal details (stack traces, request/response bodies,
 * API keys, repository paths) are never included in the response.
 */
/**
 * IP del cliente (V1 FINAL, FASE 3).
 *
 * - trustProxy=true → primer valor de `X-Forwarded-For` (solo detrás de un
 *   proxy de confianza que sobrescribe la cabecera; p. ej. Vercel/Fly).
 * - trustProxy=false (default) → dirección del socket. Un atacante que envía
 *   `X-Forwarded-For` a pelo NO consigue crear contadores distintos: todas
 *   sus peticiones comparten la misma clave.
 */
function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')
    if (forwarded !== undefined) {
      return forwarded.split(',')[0]?.trim() ?? 'unknown'
    }
  }
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming
  return incoming?.socket?.remoteAddress ?? 'unknown'
}

function mapError(c: Context, error: unknown, requestId: string) {
  if (error instanceof AIProviderError) {
    const code = providerErrorCode(error)
    if (code === 'rate_limit') {
      return c.json(
        { error: { code: 'rate_limit', message: 'Provider rate limit exceeded.', requestId } },
        429,
      )
    }
    if (code === 'timeout') {
      return c.json(
        { error: { code: 'provider_timeout', message: 'Provider timed out.', requestId } },
        503,
      )
    }
    // auth, unavailable, invalid_response → upstream provider failure.
    return c.json(
      { error: { code: 'provider_unavailable', message: 'Provider unavailable.', requestId } },
      502,
    )
  }
  // Unexpected internal error: safe generic message, never internals.
  return c.json({ error: { code: 'internal', message: 'Internal server error.', requestId } }, 500)
}

/**
 * Reads the stable provider error code from the AIProviderError cause chain.
 *
 * AI Core wraps provider errors in AIProviderError; callers may wrap again.
 * Walk the chain until an object with a string `code` is found (e.g.
 * NvidiaProviderError). Safe: never exposes the error internals, only the
 * code used to pick an HTTP status.
 */
function providerErrorCode(error: AIProviderError): string | undefined {
  let current: unknown = error.cause
  const seen = new Set<unknown>()
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string') return code
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}
