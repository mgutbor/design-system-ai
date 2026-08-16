import { serve } from '@hono/node-server'
import { NvidiaProvider, MockProvider } from '@ods-ai/ai-providers'
import { createApp } from '../app'

/**
 * Local Node entrypoint (ADR-005: entrypoints/node.ts).
 *
 * Provider selection by environment:
 * - AI_PROVIDER=nvidia (or NVIDIA_API_KEY set) → NvidiaProvider
 * - anything else / unset → MockProvider (offline, deterministic, no API key)
 *
 * The API key is read ONLY server-side from the environment; it is never in
 * the browser, the repository, logs or HTTP responses.
 */
function selectProvider() {
  const explicit = process.env.AI_PROVIDER
  const hasKey = Boolean(process.env.NVIDIA_API_KEY)
  if (explicit === 'nvidia' || hasKey) {
    // Throws NvidiaProviderError at construction if misconfigured — fail fast.
    return new NvidiaProvider()
  }
  return new MockProvider()
}

const provider = selectProvider()

// Rate limiting (V1-0, P0-2): activo por defecto (60 req/min por IP);
// RATE_LIMIT_MAX=0 lo desactiva (p. ej. dev local o detrás de un proxy
// que ya limita). En memoria: válido para una sola instancia (deploy.md).
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 60)
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)

// CORS (V1 FINAL, FASE 2): si CORS_ORIGIN no está definido, el default de
// desarrollo permite cualquier origen. En producción, lista separada por
// comas de orígenes permitidos, p. ej.
//   CORS_ORIGIN=https://ods-ai.dev,https://www.ods-ai.dev
const corsOrigins = process.env.CORS_ORIGIN?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// IP del cliente (V1 FINAL, FASE 3): TRUST_PROXY=1 solo detrás de un proxy
// de confianza que sobrescribe X-Forwarded-For. Sin él, se usa la dirección
// del socket y X-Forwarded-For enviado por el cliente NO se confía.
const trustProxy = process.env.TRUST_PROXY === '1'

const app = createApp({
  provider,
  ...(rateLimitMax > 0 ? { rateLimit: { max: rateLimitMax, windowMs: rateLimitWindowMs } } : {}),
  ...(corsOrigins !== undefined ? { corsOrigins } : {}),
  ...(trustProxy ? { trustProxy } : {}),
})

const port = Number(process.env.PORT ?? 3001)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port} (provider: ${provider.id})`)
})
