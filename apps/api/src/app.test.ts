import { describe, expect, it, vi } from 'vitest'
import { MockProvider, NvidiaProvider, NvidiaProviderError } from '@ods-ai/ai-providers'
import { AIProviderError, type AIProvider, type AIResponse } from '@ods-ai/ai-core'
import { createApp } from './app'

const BASE = 'http://localhost'

function post(app: ReturnType<typeof createApp>, path: string, body?: unknown) {
  return app.request(`${BASE}${path}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/ask (F7 §7–§10)', () => {
  it('1. valid POST → 200 with a grounded answer (MockProvider)', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      requestId: string
      answer: string
      referencedComponents: string[]
      confidence: string
      hasRelevantContext: boolean
      providerId: string
      retrieval: { query: string; components: unknown[]; minScore: number }
    }
    expect(typeof data.requestId).toBe('string')
    expect(data.referencedComponents).toContain('button')
    expect(data.hasRelevantContext).toBe(true)
    expect(data.providerId).toBe('mock')
    expect(data.retrieval.query).toBe('¿Cómo uso Button?')
    expect(data.retrieval.minScore).toBe(20)
  })

  it('2. Button → grounded response', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    const data = (await res.json()) as { referencedComponents: string[] }
    expect(data.referencedComponents).toContain('button')
  })

  it('3. Input → grounded response', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo valido un Input?' })
    const data = (await res.json()) as { referencedComponents: string[] }
    expect(data.referencedComponents).toContain('input')
  })

  it('4. FormField → grounded response', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo funciona FormField con errores?' })
    const data = (await res.json()) as { referencedComponents: string[] }
    expect(data.referencedComponents).toContain('form-field')
  })

  it('5. DatePicker → refusal (no provider call, confidence none)', async () => {
    const mock = new MockProvider()
    const spy = vi.spyOn(mock, 'chat')
    const app = createApp({ provider: mock })
    const res = await post(app, '/api/ask', { question: 'Necesito un DatePicker' })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      confidence: string
      referencedComponents: string[]
      hasRelevantContext: boolean
      answer: string
    }
    expect(data.confidence).toBe('none')
    expect(data.referencedComponents).toEqual([])
    expect(data.hasRelevantContext).toBe(false)
    expect(data.answer).toContain('No existe documentación relevante')
    // The refusal must never call the provider.
    expect(spy).not.toHaveBeenCalled()
  })

  it('6. empty body → 400', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', undefined)
    expect(res.status).toBe(400)
  })

  it('7. missing question → 400', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', {})
    expect(res.status).toBe(400)
  })

  it('8. question not a string → 400', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: 42 })
    expect(res.status).toBe(400)
  })

  it('9. empty question → 400', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '   ' })
    expect(res.status).toBe(400)
  })

  it('9b. question too long → 400', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: 'a'.repeat(4001) })
    expect(res.status).toBe(400)
  })

  it('10. provider error → safe status (502) without internals', async () => {
    const failing: AIProvider = {
      id: 'mock',
      chat: async () => {
        throw new Error('ECONNREFUSED /Users/secret/node_modules/x')
      },
    }
    const app = createApp({ provider: failing })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    // A provider failure is a 502 (bad gateway), never 200, never internals.
    expect(res.status).toBe(502)
    const text = await res.text()
    expect(text).not.toContain('ECONNREFUSED')
    expect(text).not.toContain('node_modules')
    expect(text).not.toContain('/Users/')
  })

  it('10b. AIProviderError with auth cause → 502', async () => {
    const failing: AIProvider = {
      id: 'mock',
      chat: async () => {
        throw new AIProviderError(
          'mock',
          'provider failed',
          new NvidiaProviderError('auth', 'bad key'),
        )
      },
    }
    const app = createApp({ provider: failing })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(res.status).toBe(502)
  })

  it('11. provider timeout → 503', async () => {
    const failing: AIProvider = {
      id: 'mock',
      chat: async () => {
        throw new AIProviderError(
          'mock',
          'provider failed',
          new NvidiaProviderError('timeout', 'timed out'),
        )
      },
    }
    const app = createApp({ provider: failing })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(res.status).toBe(503)
  })

  it('12. provider rate limit → 429', async () => {
    const failing: AIProvider = {
      id: 'mock',
      chat: async () => {
        throw new AIProviderError(
          'mock',
          'provider failed',
          new NvidiaProviderError('rate_limit', 'slow down'),
        )
      },
    }
    const app = createApp({ provider: failing })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(res.status).toBe(429)
  })

  it('13. invalid provider response → safe error (never a fake success)', async () => {
    const invalid: AIProvider = {
      id: 'mock',
      chat: async () => ({ content: 42 }) as unknown as AIResponse,
    }
    const app = createApp({ provider: invalid })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    // An invalid provider response is a provider failure (502), never a 200.
    expect(res.status).toBe(502)
  })

  it('14. no secrets leak in responses', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    const text = await res.text()
    expect(text).not.toContain('NVIDIA_API_KEY')
    expect(text).not.toContain('Authorization')
    expect(text).not.toContain('Bearer ')
  })

  it('15. no internal paths leak in responses', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    const text = await res.text()
    expect(text).not.toContain('packages/')
    expect(text).not.toContain('node_modules')
    expect(text).not.toContain('sourcePath')
    expect(text).not.toContain('/Users/')
  })

  it('16. MockProvider works end-to-end offline (no key, no internet)', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', {
      question: '¿Qué componente sirve para seleccionar una opción?',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { referencedComponents: string[] }
    expect(data.referencedComponents).toContain('select')
  })

  it('17. NvidiaProvider and MockProvider satisfy the same port through the API', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { role: 'assistant', content: 'Usa Select.' } }],
            model: 'nvidia-test',
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    const nvidia = new NvidiaProvider({
      apiKey: 'test-key',
      model: 'nvidia-test',
      fetch: fetchMock as unknown as typeof fetch,
    })
    const app = createApp({ provider: nvidia })
    const res = await post(app, '/api/ask', {
      question: '¿Qué componente sirve para seleccionar una opción?',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      providerId: string
      answer: string
      referencedComponents: string[]
    }
    expect(data.providerId).toBe('nvidia')
    expect(data.answer).toBe('Usa Select.')
    expect(data.referencedComponents).toContain('select')
  })
})

describe('Rate limiting y límite de body (V1-0, P0-2)', () => {
  it('a. superar el límite por IP → 429 con Retry-After, sin exponer internals', async () => {
    const app = createApp({
      provider: new MockProvider(),
      rateLimit: { max: 2, windowMs: 60_000 },
      // El test usa X-Forwarded-For: se activa trustProxy (como en producción
      // detrás de un proxy de confianza).
      trustProxy: true,
    })
    const ok1 = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    const ok2 = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(ok1.status).toBe(200)
    expect(ok2.status).toBe(200)
    const blocked = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('Retry-After') ?? 0)).toBeGreaterThan(0)
    const data = (await blocked.json()) as { error: { code: string; message: string } }
    expect(data.error.code).toBe('rate_limit')
    expect(blocked.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('b. claves distintas no comparten contador (por IP)', async () => {
    const app = createApp({
      provider: new MockProvider(),
      rateLimit: { max: 1, windowMs: 60_000 },
      trustProxy: true,
    })
    const first = await app.request(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.1' },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    const second = await app.request(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.2' },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
  })

  it('f. sin TRUST_PROXY, X-Forwarded-For falsificado NO crea contadores distintos (anti-spoofing)', async () => {
    const app = createApp({
      provider: new MockProvider(),
      rateLimit: { max: 1, windowMs: 60_000 },
      // trustProxy false (default): la cabecera no se confía.
    })
    const spoof1 = await app.request(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '6.6.6.6' },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    const spoof2 = await app.request(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '7.7.7.7' },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    // Ambas peticiones comparten la clave (misma dirección de socket / 'unknown'):
    // la segunda ya está bloqueada — el atacante no puede rotar IPs falsas.
    expect(spoof1.status).toBe(200)
    expect(spoof2.status).toBe(429)
  })

  it('c. health NO se rate-limita (la UI lo consulta al cargar)', async () => {
    const app = createApp({
      provider: new MockProvider(),
      rateLimit: { max: 1, windowMs: 60_000 },
    })
    await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    const health = await app.request(`${BASE}/api/health`)
    expect(health.status).toBe(200)
  })

  it('d. body demasiado grande → 413 sin parsear', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await app.request(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'a'.repeat(70_000) }),
    })
    expect(res.status).toBe(413)
    const data = (await res.json()) as { error: { code: string } }
    expect(data.error.code).toBe('payload_too_large')
  })

  it('e. body normal sigue funcionando tras el límite', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(res.status).toBe(200)
  })
})

describe('CORS (F5: docs UI consumes /api/ask cross-origin)', () => {
  it('OPTIONS preflight → 204 with CORS headers', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await app.request(`${BASE}/api/ask`, { method: 'OPTIONS' })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
  })

  it('POST /api/ask response carries the CORS header (docs origin can read it)', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('CORS restringido en producción (V1 FINAL, FASE 2)', () => {
  const docsOrigin = 'https://docs.example.com'
  const evilOrigin = 'https://evil.example'

  it('preflight desde origen permitido → 204 con ACAO = origen + Vary: Origin', async () => {
    const app = createApp({ provider: new MockProvider(), corsOrigins: [docsOrigin] })
    const res = await app.request(`${BASE}/api/ask`, {
      method: 'OPTIONS',
      headers: { Origin: docsOrigin },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(docsOrigin)
    expect(res.headers.get('Vary')).toContain('Origin')
  })

  it('preflight desde origen NO permitido → 204 SIN ACAO (el navegador bloquea)', async () => {
    const app = createApp({ provider: new MockProvider(), corsOrigins: [docsOrigin] })
    const res = await app.request(`${BASE}/api/ask`, {
      method: 'OPTIONS',
      headers: { Origin: evilOrigin },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('petición real desde origen permitido → 200 con ACAO = origen', async () => {
    const app = createApp({ provider: new MockProvider(), corsOrigins: [docsOrigin] })
    const res = await app.request(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: docsOrigin },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(docsOrigin)
  })

  it('petición real desde origen NO permitido → 403 sin exponer internals', async () => {
    const app = createApp({ provider: new MockProvider(), corsOrigins: [docsOrigin] })
    const res = await app.request(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: evilOrigin },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    expect(res.status).toBe(403)
    const data = (await res.json()) as { error: { code: string; message: string } }
    expect(data.error.code).toBe('origin_not_allowed')
    expect(data.error.message).toBe('Origin not allowed.')
    // Sin internals: ni claves, ni configuración, ni proveedor.
    expect(JSON.stringify(data)).not.toContain('NVIDIA')
    expect(JSON.stringify(data)).not.toContain('api_key')
  })

  it('petición sin Origin (curl/server-to-server) → 200 sin exigir CORS', async () => {
    const app = createApp({ provider: new MockProvider(), corsOrigins: [docsOrigin] })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    expect(res.status).toBe(200)
  })
})

describe('GET /api/health (ADR-005)', () => {
  it('returns ok without exposing the provider key', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await app.request(`${BASE}/api/health`)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { status: string; provider: string }
    expect(data.status).toBe('ok')
    expect(data.provider).toBe('mock')
    const healthRes = await app.request(`${BASE}/api/health`)
    const text = await healthRes.text()
    expect(text).not.toContain('NVIDIA')
  })
})

describe('grounding invariant through HTTP (F7 §11)', () => {
  it('referencedComponents ⊆ gate-passing components, always', async () => {
    for (const question of [
      '¿Cómo uso Button?',
      '¿Qué componentes tienen invalid?',
      'Necesito un DatePicker',
      'control de formulario',
    ]) {
      const app = createApp({ provider: new MockProvider() })
      const res = await post(app, '/api/ask', { question })
      const data = (await res.json()) as {
        referencedComponents: string[]
        retrieval: { components: Array<{ component: string; score: number }>; minScore: number }
        hasRelevantContext: boolean
      }
      const gated = new Set(data.retrieval.components.map((c) => c.component))
      for (const ref of data.referencedComponents) {
        expect(gated.has(ref), `${question}: ${ref} not in gate-passing set`).toBe(true)
      }
      // When there is no relevant context, nothing is referenced.
      if (!data.hasRelevantContext) {
        expect(data.referencedComponents).toEqual([])
      }
    }
  })
})

describe('request/response contract (F7 §7)', () => {
  it('response fields derive from AIAnswer without extra invented fields', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await post(app, '/api/ask', { question: '¿Cómo uso Button?' })
    const data = (await res.json()) as Record<string, unknown>
    expect(data.answer).toBeDefined()
    expect(data.referencedComponents).toBeDefined()
    expect(data.confidence).toBeDefined()
    expect(data.hasRelevantContext).toBeDefined()
    expect(data.providerId).toBeDefined()
    expect(data.model).toBeDefined()
    expect(data.retrieval).toBeDefined()
    expect(data.requestId).toBeDefined()
  })
})
