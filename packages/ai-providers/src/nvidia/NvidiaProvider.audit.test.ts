import { describe, expect, it } from 'vitest'
import { NvidiaProvider, NvidiaProviderError } from './NvidiaProvider'
import type { ChatMessage } from '@ods-ai/ai-core'

/**
 * F7.1 §3 — NvidiaProvider audit matrix (cases A–Q), offline via fetch mock.
 *
 * Guarantees demonstrated (not assumed):
 * - every failure maps to the correct NvidiaProviderError code;
 * - the provider's response body and sensitive headers never leak;
 * - auth (401/403) is never confused with rate limit (429);
 * - timeout and network errors never become successes;
 * - an HTTP 200 that is semantically invalid is never a success.
 */

const MESSAGES: ChatMessage[] = [{ role: 'user', content: '¿Cómo uso Button?' }]
const SECRET_HEADER = 'x-internal-secret'
const SECRET_BODY_FRAGMENT = 'upstream-internal-detail-xyz'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', [SECRET_HEADER]: 'do-not-leak' },
  })
}

function provider(fetchImpl: typeof fetch): NvidiaProvider {
  return new NvidiaProvider({ apiKey: 'k', model: 'm', fetch: fetchImpl })
}

/** The public error must be safe: no body fragment, no secret header, no key. */
async function expectSafe(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  expect(message).not.toContain(SECRET_BODY_FRAGMENT)
  expect(message).not.toContain(SECRET_HEADER)
  expect(message).not.toContain('Bearer ')
  expect(message).not.toContain('sk-')
}

describe('F7.1 §3 — provider status matrix', () => {
  it('A. HTTP 200 valid → success', async () => {
    const p = provider(async () =>
      json(200, {
        choices: [{ message: { content: 'ok' } }],
        model: 'm',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    )
    const res = await p.chat(MESSAGES)
    expect(res.content).toBe('ok')
    expect(res.finishReason).toBe('stop')
  })

  it('B. HTTP 200 with invalid JSON → invalid_response', async () => {
    const p = provider(async () => new Response('not-json', { status: 200 }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('C. HTTP 200 with incomplete schema (no choices) → invalid_response', async () => {
    const p = provider(async () => json(200, { model: 'm' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('C2. HTTP 200 with choices but no message/content → invalid_response', async () => {
    const p = provider(async () => json(200, { choices: [{ index: 0 }], model: 'm' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('D. HTTP 200 with content non-string → invalid_response', async () => {
    const p = provider(async () =>
      json(200, { choices: [{ message: { content: 42 } }], model: 'm' }),
    )
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('D2. HTTP 200 with missing model → invalid_response', async () => {
    const p = provider(async () => json(200, { choices: [{ message: { content: 'ok' } }] }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('E. HTTP 400 → unavailable (never leaks body)', async () => {
    const p = provider(async () => json(400, { error: `bad request ${SECRET_BODY_FRAGMENT}` }))
    const error = await p.chat(MESSAGES).catch((e) => e)
    expect(error).toMatchObject({ code: 'unavailable' })
    await expectSafe(error)
  })

  it('F. HTTP 401 → auth', async () => {
    const p = provider(async () => json(401, { error: 'unauthorized' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'auth' })
  })

  it('G. HTTP 403 → auth (not rate_limit)', async () => {
    const p = provider(async () => json(403, { error: 'forbidden' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'auth' })
  })

  it('H. HTTP 404 → unavailable', async () => {
    const p = provider(async () => json(404, { error: 'not found' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('I. HTTP 408 → unavailable', async () => {
    const p = provider(async () => json(408, { error: 'request timeout' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('J. HTTP 429 → rate_limit', async () => {
    const p = provider(async () => json(429, { error: 'rate limited' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'rate_limit' })
  })

  it('J2. 401 vs 429 are never confused', async () => {
    const p401 = provider(async () => json(401, {}))
    const p429 = provider(async () => json(429, {}))
    await expect(p401.chat(MESSAGES)).rejects.toMatchObject({ code: 'auth' })
    await expect(p429.chat(MESSAGES)).rejects.toMatchObject({ code: 'rate_limit' })
  })

  it('K. HTTP 500 → unavailable', async () => {
    const p = provider(async () => json(500, { error: 'internal' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('L. HTTP 502 → unavailable', async () => {
    const p = provider(async () => json(502, { error: 'bad gateway' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('M. HTTP 503 → unavailable', async () => {
    const p = provider(async () => json(503, { error: 'unavailable' }))
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('N. timeout (never resolves) → timeout', async () => {
    const p = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      timeoutMs: 10,
      fetch: ((_url: string | URL | Request, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        })) as unknown as typeof fetch,
    })
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'timeout' })
  })

  it('O. AbortError from the network layer → timeout, never success', async () => {
    const p = provider(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError')
    })
    await expect(p.chat(MESSAGES)).rejects.toMatchObject({ code: 'timeout' })
  })

  it('P. network error → invalid_response, never success, no internals', async () => {
    const p = provider(async () => {
      throw new Error(`fetch failed: ECONNREFUSED ${SECRET_BODY_FRAGMENT}`)
    })
    const error: unknown = await p.chat(MESSAGES).catch((e) => e)
    expect(error).toMatchObject({ code: 'invalid_response' })
    await expectSafe(error)
  })

  it('Q. extremely large response → parsed without crash', async () => {
    const huge = 'x'.repeat(2_000_000)
    const p = provider(async () =>
      json(200, { choices: [{ message: { content: huge } }], model: 'm' }),
    )
    const res = await p.chat(MESSAGES)
    expect(res.content.length).toBe(2_000_000)
  })
})

describe('F7.1 §3 — no false successes', () => {
  it('a 200 with unusable content never resolves to a success', async () => {
    const badBodies: unknown[] = [
      { choices: [], model: 'm' },
      { choices: [{}], model: 'm' },
      { choices: [{ message: {} }], model: 'm' },
      { choices: [{ message: { content: '' } }], model: 'm' }, // empty string is still a string → ok
      {},
      [],
      null,
    ]
    for (const body of badBodies) {
      const p = provider(async () => json(200, body))
      // Only the empty-content case is a valid (if empty) response; the rest must fail.
      const result = await p.chat(MESSAGES).catch((e) => e)
      const firstChoice = (body as { choices?: Array<{ message?: { content?: unknown } }> } | null)
        ?.choices?.[0]
      const isEmptyContent =
        typeof firstChoice?.message?.content === 'string' && firstChoice.message.content === ''
      if (isEmptyContent) {
        expect(result).not.toMatchObject({ code: 'invalid_response' })
      } else {
        expect(result).toMatchObject({ code: 'invalid_response' })
      }
    }
  })

  it('timeout and network errors are errors, never AIResponse', async () => {
    const attempts: Array<() => Promise<unknown>> = [
      () =>
        new NvidiaProvider({
          apiKey: 'k',
          model: 'm',
          timeoutMs: 5,
          // Real fetch rejects on abort; the mock must simulate that.
          fetch: ((_url: string | URL | Request, init?: RequestInit) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('Aborted', 'AbortError')),
              )
            })) as unknown as typeof fetch,
        }).chat(MESSAGES),
      () =>
        provider(async () => {
          throw new TypeError('fetch failed')
        }).chat(MESSAGES),
    ]
    for (const attempt of attempts) {
      const result = await attempt().catch((e) => e)
      expect(result).toBeInstanceOf(NvidiaProviderError)
      expect(result).not.toHaveProperty('content')
      expect(result).not.toHaveProperty('finishReason')
    }
  })
})
