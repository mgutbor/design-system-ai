import { describe, expect, it, vi } from 'vitest'
import { NvidiaProvider } from '@ods-ai/ai-providers'
import { createApp } from '../app'

/**
 * F7.1 §13 — Real NVIDIA smoke test (OPT-IN).
 *
 * Never runs in CI by default. Only runs when BOTH credentials are present in
 * the environment AND the test is explicitly enabled:
 *   NVIDIA_API_KEY + NVIDIA_MODEL + RUN_NVIDIA_SMOKE=1
 *
 * It checks a single question ("¿Cómo uso Button?") and verifies:
 * - HTTP 200; valid answer; referencedComponents only from retrieval;
 * - no secrets, no sourcePath, no out-of-context detectable info.
 *
 * If no valid credentials exist, the test is skipped (the result is NOT
 * invented). Use `describe.skipIf(...)` so the suite reports a skip, not a
 * pass, when it cannot run.
 */

const apiKey = process.env.NVIDIA_API_KEY
const model = process.env.NVIDIA_MODEL
const enabled = process.env.RUN_NVIDIA_SMOKE === '1'
const canRun = enabled && Boolean(apiKey) && Boolean(model)

describe.skipIf(!canRun)('F7.1 §13 — real NVIDIA smoke test (opt-in)', () => {
  // Real LLM round-trips exceed vitest's default 5s test timeout, so each
  // case gets an explicit 150s budget. NVIDIA Build latency for this model is
  // variable (observed 19.5s–30s+ for a grounded prompt), so the provider
  // timeout is raised to 90s for the smoke test only (production default and
  // NVIDIA_TIMEOUT_MS remain untouched — see docs/api.md).
  it('"¿Cómo uso Button?" returns a grounded, safe response', async () => {
    const provider = new NvidiaProvider({ timeoutMs: 90_000 })
    // Instrumentation: prove the REAL provider (LLM) was actually invoked.
    const chatSpy = vi.spyOn(provider, 'chat')
    const app = createApp({ provider })
    const res = await app.request('http://localhost/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })

    // HTTP 200 and a valid answer.
    expect(res.status).toBe(200)
    expect(chatSpy).toHaveBeenCalledTimes(1)
    const data = (await res.json()) as {
      answer: string
      referencedComponents: string[]
      confidence: string
      hasRelevantContext: boolean
      retrieval: { components: Array<{ component: string; score: number }> }
    }
    expect(typeof data.answer).toBe('string')
    expect(data.answer.length).toBeGreaterThan(0)
    expect(data.hasRelevantContext).toBe(true)

    // referencedComponents only from gate-passing retrieval.
    const gated = new Set(data.retrieval.components.map((c) => c.component))
    for (const ref of data.referencedComponents) {
      expect(gated.has(ref)).toBe(true)
    }
    expect(data.referencedComponents).toContain('button')

    // No secrets, no internal paths, no detectable out-of-context claims.
    const serialized = JSON.stringify(data)
    expect(serialized).not.toContain('NVIDIA_API_KEY')
    expect(serialized).not.toContain('sk-')
    expect(serialized).not.toContain('sourcePath')
    expect(serialized).not.toContain('node_modules')
    expect(serialized).not.toContain('packages/')
    expect(serialized).not.toContain('DatePicker')
  }, 150_000)

  it('"Necesito un DatePicker" keeps the refusal (no provider call, no sources)', async () => {
    const provider = new NvidiaProvider({ timeoutMs: 90_000 })
    // Instrumentation: the gate must reject BEFORE the LLM, so the provider
    // (and therefore the external NVIDIA call) must never be invoked.
    const chatSpy = vi.spyOn(provider, 'chat')
    const app = createApp({ provider })
    const res = await app.request('http://localhost/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Necesito un DatePicker' }),
    })

    // Refusal is a 200 with the deterministic "no relevant context" contract:
    // ai-core refuses BEFORE calling the provider, so this must hold end-to-end
    // with the real provider configured too.
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      answer: string
      confidence: string
      referencedComponents: string[]
      hasRelevantContext: boolean
    }
    expect(data.hasRelevantContext).toBe(false)
    expect(data.confidence).toBe('none')
    expect(data.referencedComponents).toEqual([])
    expect(data.answer).toContain('No existe documentación relevante')
    expect(chatSpy).not.toHaveBeenCalled()

    const serialized = JSON.stringify(data)
    expect(serialized).not.toContain('NVIDIA_API_KEY')
    expect(serialized).not.toContain('sk-')
    expect(serialized).not.toContain('sourcePath')
    expect(serialized).not.toContain('node_modules')
    expect(serialized).not.toContain('packages/')
  }, 150_000)
})
