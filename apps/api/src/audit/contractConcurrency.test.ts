import { describe, expect, it } from 'vitest'
import { MockProvider } from '@ods-ai/ai-providers'
import { createApp } from '../app'

/**
 * F7.1 §10 — HTTP response contract.
 * F7.1 §11 — concurrency: simultaneous requests are isolated (no shared
 * mutable state, no cross-contamination of retrieval/context/config, and each
 * requestId stays associated with its own response).
 */

const BASE = 'http://localhost'

function ask(app: ReturnType<typeof createApp>, question: string) {
  return app.request(`${BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
}

describe('F7.1 §10 — response contract', () => {
  it('every success has a requestId that changes between requests', async () => {
    const app = createApp({ provider: new MockProvider() })
    const a = (await (await ask(app, '¿Cómo uso Button?')).json()) as { requestId: string }
    const b = (await (await ask(app, '¿Cómo uso Input?')).json()) as { requestId: string }
    expect(typeof a.requestId).toBe('string')
    expect(a.requestId.length).toBeGreaterThan(0)
    expect(a.requestId).not.toBe(b.requestId)
  })

  it('every error has a requestId that changes between requests', async () => {
    const app = createApp({ provider: new MockProvider() })
    const e1 = (await (await ask(app, '')).json()) as { error: { requestId: string } }
    const e2 = (await (await ask(app, '')).json()) as { error: { requestId: string } }
    expect(typeof e1.error.requestId).toBe('string')
    expect(e1.error.requestId).not.toBe(e2.error.requestId)
  })

  it('one request → exactly one public requestId (not duplicated in body)', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await ask(app, '¿Cómo uso Button?')
    const text = await res.text()
    const matches = text.match(/requestId/g)
    // requestId appears once as the key; its value appears once. Count the
    // uuid-ish values, not the key name.
    const uuidCount = (
      text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []
    ).length
    expect(uuidCount).toBe(1)
    expect(matches).not.toBeNull()
  })

  it('requestId contains no secrets and no internal paths', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await ask(app, '¿Cómo uso Button?')
    const text = await res.text()
    expect(text).not.toContain('NVIDIA')
    expect(text).not.toContain('sk-')
    expect(text).not.toContain('node_modules')
    expect(text).not.toContain('/Users/')
  })

  it('error contract is stable: { error: { code, message, requestId } }', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await ask(app, '')
    const data = (await res.json()) as {
      error: { code: string; message: string; requestId: string }
    }
    expect(Object.keys(data).sort()).toEqual(['error'])
    expect(Object.keys(data.error).sort()).toEqual(['code', 'message', 'requestId'])
  })

  it('success contract: { requestId, ...AIAnswer } with no invented fields', async () => {
    const app = createApp({ provider: new MockProvider() })
    const res = await ask(app, '¿Cómo uso Button?')
    const data = (await res.json()) as Record<string, unknown>
    const expected = [
      'requestId',
      'answer',
      'referencedComponents',
      'confidence',
      'hasRelevantContext',
      'providerId',
      'model',
      'retrieval',
    ]
    expect(Object.keys(data).sort()).toEqual(expected.sort())
  })
})

describe('F7.1 §11 — concurrency', () => {
  it('simultaneous requests keep their own retrieval and requestId', async () => {
    const app = createApp({ provider: new MockProvider() })
    const questions = [
      '¿Cómo uso Button?',
      '¿Cómo valido un Input?',
      '¿Cómo uso un Select?',
      '¿Cómo funciona FormField con errores?',
      '¿Qué tokens usa Modal?',
      'Necesito un DatePicker',
      '¿Qué componente es un Badge?',
      '¿Cómo se usa Checkbox?',
      '¿Qué es un Spinner?',
      'control de formulario',
    ]
    const results = await Promise.all(
      questions.map(async (q) => {
        const res = await ask(app, q)
        const data = (await res.json()) as {
          requestId: string
          retrieval: { query: string }
          referencedComponents: string[]
          confidence: string
        }
        return { q, data }
      }),
    )

    // Each response is associated with its own question (no cross-talk).
    for (const { q, data } of results) {
      expect(data.retrieval.query).toBe(q)
      expect(data.requestId.length).toBeGreaterThan(0)
      if (q === 'Necesito un DatePicker') {
        expect(data.confidence).toBe('none')
        expect(data.referencedComponents).toEqual([])
      } else {
        expect(data.confidence).not.toBe('none')
      }
    }

    // All requestIds are distinct.
    const ids = new Set(results.map((r) => r.data.requestId))
    expect(ids.size).toBe(questions.length)
  })

  it('a failure in one request does not contaminate another', async () => {
    const app = createApp({ provider: new MockProvider() })
    // Fire a failing request (invalid input) and a valid request concurrently.
    const [bad, good] = await Promise.all([
      app.request(`${BASE}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid',
      }),
      ask(app, '¿Cómo uso Button?'),
    ])
    expect(bad.status).toBe(400)
    expect(good.status).toBe(200)
    const goodData = (await good.json()) as { referencedComponents: string[] }
    expect(goodData.referencedComponents).toContain('button')
  })

  it('refusal and grounded requests do not interfere under concurrency', async () => {
    const app = createApp({ provider: new MockProvider() })
    const batch = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? ask(app, '¿Cómo uso Button?') : ask(app, 'Necesito un DatePicker'),
    )
    const responses = await Promise.all(batch)
    const data = await Promise.all(
      responses.map(
        (r) => r.json() as Promise<{ confidence: string; referencedComponents: string[] }>,
      ),
    )
    for (let i = 0; i < data.length; i++) {
      const item = data[i]!
      if (i % 2 === 0) {
        expect(item.confidence).not.toBe('none')
        expect(item.referencedComponents).toContain('button')
      } else {
        expect(item.confidence).toBe('none')
        expect(item.referencedComponents).toEqual([])
      }
    }
  })
})
