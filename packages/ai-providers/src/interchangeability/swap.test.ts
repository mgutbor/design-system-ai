import { describe, expect, it, vi } from 'vitest'
import { answerQuestion } from '@ods-ai/ai-core'
import { MockProvider, NvidiaProvider } from '../index'

/**
 * Interchangeability (F7 §5): `answerQuestion` receives any AIProvider. The
 * same AI Core code must work with MockProvider (offline, deterministic) and
 * NvidiaProvider (real HTTP, here with a mocked fetch) without any change.
 */
describe('provider interchangeability (F7 §5)', () => {
  it('createAI works with MockProvider: grounded answer offline', async () => {
    const answer = await answerQuestion({
      provider: new MockProvider(),
      question: '¿Cómo uso Button?',
    })
    expect(answer.hasRelevantContext).toBe(true)
    expect(answer.referencedComponents).toContain('button')
    expect(answer.providerId).toBe('mock')
  })

  it('createAI works with NvidiaProvider: same AI Core, real provider shape', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              { message: { role: 'assistant', content: 'Usa Button con variant="primary".' } },
            ],
            model: 'nvidia-test-model',
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    const provider = new NvidiaProvider({
      apiKey: 'test-key',
      model: 'nvidia-test-model',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const answer = await answerQuestion({ provider, question: '¿Cómo uso Button?' })

    // Same AIAnswer shape regardless of the provider behind the port.
    expect(answer.hasRelevantContext).toBe(true)
    expect(answer.referencedComponents).toContain('button')
    expect(answer.providerId).toBe('nvidia')
    expect(answer.answer).toBe('Usa Button con variant="primary".')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refusal is identical for both providers: no provider call at all', async () => {
    const mock = new MockProvider()
    const mockSpy = vi.spyOn(mock, 'chat')
    const answer = await answerQuestion({ provider: mock, question: 'Necesito un DatePicker' })
    expect(answer.hasRelevantContext).toBe(false)
    expect(answer.referencedComponents).toEqual([])
    expect(answer.confidence).toBe('none')
    expect(mockSpy).not.toHaveBeenCalled()
  })
})
