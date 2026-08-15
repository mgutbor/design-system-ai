import { describe, expect, it } from 'vitest'
import { MockProvider, mockProvider } from './MockProvider'

describe('MockProvider (F6 §3)', () => {
  it('implements the AIProvider contract', () => {
    const provider: MockProvider = mockProvider
    expect(provider.id).toBe('mock')
  })

  it('is deterministic: same input always yields the same response', async () => {
    const provider = new MockProvider()
    const messages = [
      { role: 'system' as const, content: 'system' },
      { role: 'user' as const, content: '¿Cómo uso Button?' },
    ]
    const first = await provider.chat(messages)
    const second = await provider.chat(messages)
    expect(first).toEqual(second)
  })

  it('reflects the user question and counts system messages', async () => {
    const provider = new MockProvider()
    const response = await provider.chat([
      { role: 'system', content: 'instructions' },
      { role: 'user', content: '¿Qué tokens utiliza Modal?' },
    ])
    expect(response.content).toContain('¿Qué tokens utiliza Modal?')
    expect(response.content).toContain('1 mensaje(s) system')
  })

  it('returns a stable structured envelope', async () => {
    const response = await mockProvider.chat([{ role: 'user', content: 'hi' }])
    expect(response.providerId).toBe('mock')
    expect(response.model).toBe('mock-1')
    expect(response.finishReason).toBe('stop')
    expect(response.usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 })
  })

  it('works without any external service (pure function of its input)', async () => {
    // No fetch, no env, no key: just messages in → response out.
    const response = await mockProvider.chat([{ role: 'user', content: 'hola' }])
    expect(response.content).toContain('hola')
  })
})
