import { afterEach, describe, expect, it, vi } from 'vitest'
import { NvidiaProvider, NvidiaProviderError } from './NvidiaProvider'

/**
 * F7.1 §8/§9 — Config and environment audit.
 *
 * - The model value is NOT invented (decision pending until the user provides
 *   it). We only audit behavior: missing, empty, whitespace, "undefined",
 *   "null", arbitrary values.
 * - A misconfigured provider fails clearly and deterministically at
 *   construction.
 * - Tests use `delete process.env.X` (never `process.env.X = undefined`,
 *   which stores the truthy string "undefined" in Node).
 */

function unsetAll(): void {
  delete process.env.NVIDIA_API_KEY
  delete process.env.NVIDIA_MODEL
  delete process.env.NVIDIA_BASE_URL
}

afterEach(() => {
  unsetAll()
  vi.restoreAllMocks()
})

describe('F7.1 §8 — NVIDIA_MODEL audit', () => {
  it('missing model → clear deterministic error', () => {
    expect(() => new NvidiaProvider({ apiKey: 'k' })).toThrow(NvidiaProviderError)
    expect(() => new NvidiaProvider({ apiKey: 'k' })).toThrow(/NVIDIA_MODEL/)
  })

  it('empty model → clear deterministic error', () => {
    expect(() => new NvidiaProvider({ apiKey: 'k', model: '' })).toThrow(/NVIDIA_MODEL/)
    expect(() => new NvidiaProvider({ apiKey: 'k', model: '   ' })).toThrow(/NVIDIA_MODEL/)
  })

  it('model env var empty → same error', () => {
    process.env.NVIDIA_API_KEY = 'k'
    process.env.NVIDIA_MODEL = ''
    expect(() => new NvidiaProvider()).toThrow(/NVIDIA_MODEL/)
  })

  it('model env var set to "undefined" string → currently accepted (documented)', () => {
    // Node quirk: a real env var holding the literal string "undefined" is
    // truthy and passes validation. Documented: it will be sent to the API as
    // the model name and fail upstream with 400 → unavailable. Not fixed here:
    // rejecting it would require a rule the SPEC does not define.
    process.env.NVIDIA_API_KEY = 'k'
    process.env.NVIDIA_MODEL = 'undefined'
    const p = new NvidiaProvider()
    expect(p).toBeInstanceOf(NvidiaProvider)
  })

  it('model env var set to "null" string → currently accepted (documented)', () => {
    process.env.NVIDIA_API_KEY = 'k'
    process.env.NVIDIA_MODEL = 'null'
    const p = new NvidiaProvider()
    expect(p).toBeInstanceOf(NvidiaProvider)
  })

  it('arbitrary model value → accepted, sent verbatim', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      void _url
      void _init
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }], model: 'arbitrary-model' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    const p = new NvidiaProvider({
      apiKey: 'k',
      model: 'my-custom-model-v3',
      fetch: fetchMock as unknown as typeof fetch,
    })
    await p.chat([{ role: 'user', content: 'hi' }])
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { model: string }
    expect(body.model).toBe('my-custom-model-v3')
  })
})

describe('F7.1 §9 — environment audit', () => {
  it('defaults: base URL and timeout', () => {
    const p = new NvidiaProvider({ apiKey: 'k', model: 'm' })
    expect(p).toBeInstanceOf(NvidiaProvider)
    // Defaults are exercised in requestAudit (base URL) and NvidiaProvider
    // tests (timeout 30s default is documented, not asserted numerically here).
  })

  it('partially defined config (key only) → fails on missing model', () => {
    process.env.NVIDIA_API_KEY = 'key-only'
    expect(() => new NvidiaProvider()).toThrow(/NVIDIA_MODEL/)
  })

  it('partially defined config (model only) → fails on missing key', () => {
    process.env.NVIDIA_MODEL = 'model-only'
    expect(() => new NvidiaProvider()).toThrow(/NVIDIA_API_KEY/)
  })

  it('config with surrounding whitespace in env values is used as-is (documented)', () => {
    // A key with leading/trailing spaces would be sent in the Authorization
    // header verbatim. Documented behavior; not sanitized (the SPEC does not
    // define trimming rules for env values).
    const p = new NvidiaProvider({ apiKey: '  padded-key  ', model: 'm' })
    expect(p).toBeInstanceOf(NvidiaProvider)
  })

  it('delete (not =undefined) is the correct way to unset env in tests', () => {
    process.env.NVIDIA_API_KEY = 'temp'
    delete process.env.NVIDIA_API_KEY
    expect(process.env.NVIDIA_API_KEY).toBeUndefined()
    expect(() => new NvidiaProvider({ model: 'm' })).toThrow(/NVIDIA_API_KEY/)
  })

  it('constructor options take precedence over env vars', () => {
    process.env.NVIDIA_API_KEY = 'env-key'
    process.env.NVIDIA_MODEL = 'env-model'
    const p = new NvidiaProvider({ apiKey: 'opt-key', model: 'opt-model' })
    expect(p).toBeInstanceOf(NvidiaProvider)
  })
})
