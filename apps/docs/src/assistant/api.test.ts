// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkHealth } from './api'

function stubFetch(implementation: typeof fetch): void {
  vi.stubGlobal('fetch', vi.fn(implementation))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('checkHealth (V1-0, P1-3)', () => {
  it('responde true cuando GET /api/health devuelve ok', async () => {
    stubFetch(async () => new Response('{"status":"ok"}', { status: 200 }))
    await expect(checkHealth()).resolves.toBe(true)
  })

  it('responde false cuando la API devuelve un error HTTP', async () => {
    stubFetch(async () => new Response('error', { status: 503 }))
    await expect(checkHealth()).resolves.toBe(false)
  })

  it('responde false ante un error de red (API caída)', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(checkHealth()).resolves.toBe(false)
  })

  it('aborta la petición tras el timeout (no cuelga) y responde false', async () => {
    stubFetch(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    vi.useFakeTimers()
    const pending = checkHealth(500)
    const assertion = expect(pending).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(500)
    await assertion
  })
})
