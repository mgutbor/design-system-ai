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
  it('responde "available" cuando GET /api/health devuelve ok', async () => {
    stubFetch(async () => new Response('{"status":"ok"}', { status: 200 }))
    await expect(checkHealth()).resolves.toBe('available')
  })

  it('responde "unavailable" cuando la API devuelve un error HTTP', async () => {
    stubFetch(async () => new Response('error', { status: 503 }))
    await expect(checkHealth()).resolves.toBe('unavailable')
  })

  it('responde "unavailable" ante un error de red (API caída)', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(checkHealth()).resolves.toBe('unavailable')
  })

  it('responde "waking" (no "unavailable") cuando la petición aborta por timeout', async () => {
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
    const assertion = expect(pending).resolves.toBe('waking')
    await vi.advanceTimersByTimeAsync(500)
    await assertion
  })

  it('usa un timeout por defecto de 10 s (cold start de Render Free)', () => {
    // El default debe cubrir el arranque del free tier (~10-12 s), no los 3 s
    // que abortaban prematuramente durante el spin-up.
    stubFetch(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    vi.useFakeTimers()
    const pending = checkHealth()
    const assertion = expect(pending).resolves.toBe('waking')
    // A los 9 s todavía NO ha abortado (la petición sigue en curso).
    const notYet = vi
      .advanceTimersByTimeAsync(9_000)
      .then(() => expect(vi.getTimerCount()).toBeGreaterThan(0))
    // A los 10 s aborta y resuelve como 'waking'.
    const after = vi.advanceTimersByTimeAsync(1_000).then(() => assertion)
    return Promise.all([notYet, after])
  })
})
