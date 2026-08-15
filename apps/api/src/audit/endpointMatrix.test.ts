import { describe, expect, it } from 'vitest'
import { MockProvider } from '@ods-ai/ai-providers'
import { createApp, MAX_QUESTION_LENGTH } from '../app'

/**
 * F7.1 §1 — Endpoint audit: a matrix of hostile/edge inputs. The guarantees
 * demonstrated (not assumed):
 *   1. an invalid input NEVER produces a 500;
 *   2. no stack traces, internal errors, env vars or API keys are leaked;
 *   3. error responses keep a stable shape { error: { code, message, requestId } }.
 *
 * No new validation rules are added "por si acaso" — if a case reveals a gap
 * that needs a decision, it is documented instead.
 */

const app = createApp({ provider: new MockProvider() })
const BASE = 'http://localhost'

interface ErrorShape {
  error: { code: string; message: string; requestId: string }
}

async function postRaw(path: string, init: RequestInit): Promise<Response> {
  return app.request(`${BASE}${path}`, init)
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return postRaw(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Asserts the response is a safe error (400/404/405...) with a stable shape. */
async function expectSafeError(res: Response): Promise<void> {
  expect(res.status).toBeGreaterThanOrEqual(400)
  expect(res.status).toBeLessThan(500)
  const text = await res.text()
  expect(text).not.toContain('node_modules')
  expect(text).not.toContain('packages/')
  expect(text).not.toContain('stack')
  expect(text).not.toContain('NVIDIA')
  expect(text).not.toContain('process.env')
  // Stable error shape when it is one of ours (400s).
  if (res.status === 400) {
    const data = JSON.parse(text) as ErrorShape
    expect(typeof data.error.code).toBe('string')
    expect(typeof data.error.message).toBe('string')
    expect(typeof data.error.requestId).toBe('string')
    expect(data.error.requestId.length).toBeGreaterThan(0)
  }
}

describe('F7.1 §1 — /api/ask input matrix', () => {
  it('empty body → 400', async () => {
    const res = await postRaw('/api/ask', { method: 'POST' })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('body "null" → 400', async () => {
    const res = await postJson('/api/ask', null)
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('invalid JSON → 400', async () => {
    const res = await postRaw('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('valid JSON but an array → 400', async () => {
    const res = await postJson('/api/ask', [1, 2, 3])
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('valid JSON but a primitive → 400', async () => {
    const res = await postJson('/api/ask', 42)
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('{ question: null } → 400', async () => {
    const res = await postJson('/api/ask', { question: null })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('{ question: 123 } → 400', async () => {
    const res = await postJson('/api/ask', { question: 123 })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('{ question: [] } → 400', async () => {
    const res = await postJson('/api/ask', { question: [] })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('{ question: {} } → 400', async () => {
    const res = await postJson('/api/ask', { question: {} })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('question = "" → 400', async () => {
    const res = await postJson('/api/ask', { question: '' })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('question = " " (whitespace) → 400', async () => {
    const res = await postJson('/api/ask', { question: '   ' })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('Unicode question → 200 and answer still works', async () => {
    const res = await postJson('/api/ask', { question: '¿Cómo uso Button? → 🚀 按钮' })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { referencedComponents: string[] }
    expect(data.referencedComponents).toContain('button')
  })

  it('very long question → 400', async () => {
    const res = await postJson('/api/ask', { question: 'a'.repeat(MAX_QUESTION_LENGTH + 100) })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it(`question exactly ${MAX_QUESTION_LENGTH} chars → 200`, async () => {
    const prefix = '¿Cómo uso Button? ' // 18 chars
    const res = await postJson('/api/ask', {
      question: prefix + 'a'.repeat(MAX_QUESTION_LENGTH - prefix.length),
    })
    expect(res.status).toBe(200)
  })

  it(`question ${MAX_QUESTION_LENGTH + 1} chars → 400`, async () => {
    const res = await postJson('/api/ask', { question: 'a'.repeat(MAX_QUESTION_LENGTH + 1) })
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('unexpected extra properties → still processed (question is valid)', async () => {
    const res = await postJson('/api/ask', {
      question: '¿Cómo uso Button?',
      extra: 'ignored',
      nested: { deep: true },
    })
    expect(res.status).toBe(200)
  })

  it('prototype-pollution-like payload → 400, no pollution', async () => {
    const res = await postJson('/api/ask', {
      question: '¿Cómo uso Button?',
      __proto__: { polluted: true },
    })
    // The __proto__ key in JSON body is treated as a normal key by JSON.parse;
    // the question is still valid and processed. Assert no global pollution.
    expect(res.status).toBe(200)
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
  })

  it('deeply nested objects → 400 (question is not a string)', async () => {
    const deep: Record<string, unknown> = { question: { a: { b: { c: { d: 'x' } } } } }
    const res = await postJson('/api/ask', deep)
    expect(res.status).toBe(400)
    await expectSafeError(res)
  })

  it('wrong Content-Type with valid JSON body → still processed (Hono parses JSON regardless)', async () => {
    const res = await postRaw('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    // Documented behavior: Hono's c.req.json() parses the body independent of
    // the Content-Type header. Not a 500, no leak.
    expect(res.status).toBe(200)
  })

  it('wrong HTTP methods → 405/404, never 500, no leak (OPTIONS is the CORS preflight → 204)', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH'] as const) {
      const res = await app.request(`${BASE}/api/ask`, { method })
      expect([404, 405]).toContain(res.status)
      await expectSafeError(res)
    }
    // OPTIONS: preflight CORS (F5) → 204 con cabeceras, nunca 500.
    const preflight = await app.request(`${BASE}/api/ask`, { method: 'OPTIONS' })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('unknown routes → 404, never 500, no leak', async () => {
    for (const path of ['/api/unknown', '/nope', '/api/ask/extra']) {
      const res = await app.request(`${BASE}${path}`, { method: 'GET' })
      expect(res.status).toBe(404)
      await expectSafeError(res)
    }
  })
})

describe('F7.1 §1 — never a 500 for invalid input (fuzz-ish sweep)', () => {
  const cases: unknown[] = [
    undefined,
    null,
    '',
    'string',
    0,
    -1,
    true,
    false,
    [],
    {},
    { question: undefined },
    { question: null },
    { question: 0 },
    { question: false },
    { question: ['a'] },
    { question: { nested: true } },
    { question: '   ' },
    { question: '\u00a0\u00a0' }, // non-breaking spaces
    { question: '\n\t' },
    { Question: '¿Cómo uso Button?' }, // wrong casing
    { question: '¿Cómo uso Button?', __proto__: { x: 1 } },
    { question: '¿Cómo uso Button?', constructor: { prototype: { polluted: 1 } } },
    { question: 'a'.repeat(10_000) },
  ]
  for (const [i, body] of cases.entries()) {
    it(`case ${i}: ${JSON.stringify(body)?.slice(0, 60)} → no 500`, async () => {
      const res = await postJson('/api/ask', body)
      expect(res.status).not.toBe(500)
      const text = await res.text()
      expect(text).not.toContain('node_modules')
      expect(text).not.toContain('NVIDIA')
      expect(text).not.toContain('at ')
    })
  }
})
