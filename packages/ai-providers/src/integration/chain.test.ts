import { describe, expect, it } from 'vitest'
import { answerQuestion } from '@ods-ai/ai-core'
import { mockProvider } from '../mock/MockProvider'

/**
 * Integration test (F6 §3): the full chain
 * query → retrieval → context → AI Core → MockProvider → response
 * works offline with no API key, no internet and no external service.
 */
describe('full chain with MockProvider (F6 §3)', () => {
  it('answers a grounded question end-to-end', async () => {
    const answer = await answerQuestion({
      provider: mockProvider,
      question: '¿Cómo uso Button?',
    })
    expect(answer.hasRelevantContext).toBe(true)
    expect(answer.referencedComponents).toEqual(['button'])
    expect(answer.answer).toContain('¿Cómo uso Button?')
    expect(answer.providerId).toBe('mock')
    expect(answer.model).toBe('mock-1')
  })

  it('refuses without calling the model when there is no relevant context', async () => {
    const answer = await answerQuestion({
      provider: mockProvider,
      question: 'Necesito un calendario',
    })
    expect(answer.hasRelevantContext).toBe(false)
    expect(answer.referencedComponents).toEqual([])
    expect(answer.answer).toMatch(/no existe documentación relevante/i)
    expect(answer.answer).not.toMatch(/Usa Calendario|calendario prop/i)
  })

  it('is deterministic across runs', async () => {
    const first = await answerQuestion({
      provider: mockProvider,
      question: '¿Qué tokens utiliza Modal?',
    })
    const second = await answerQuestion({
      provider: mockProvider,
      question: '¿Qué tokens utiliza Modal?',
    })
    expect(first).toEqual(second)
  })
})
