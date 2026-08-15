import { describe, expect, it } from 'vitest'
import { DEFAULT_MIN_SCORE, deriveConfidence, answerQuestion } from '../index'

import type { AIProvider, AIResponse } from '../types'

class LocalProvider implements AIProvider {
  readonly id = 'mock' as const
  constructor(private readonly content: string) {}
  async chat(): Promise<AIResponse> {
    return { content: this.content, model: 'local-1', providerId: 'mock', finishReason: 'stop' }
  }
}

describe('deriveConfidence audit (F6.1 §2)', () => {
  it('A) no results → none', async () => {
    const answer = await answerQuestion({
      provider: new LocalProvider('x'),
      question: 'calendario lunar',
    })
    expect(answer.confidence).toBe('none')
    expect(answer.hasRelevantContext).toBe(false)
  })

  it('B) one very strong result (name exact=100) → high', () => {
    expect(deriveConfidence(100)).toBe('high')
    expect(deriveConfidence(150)).toBe('high')
  })

  it('C) a weak result (just above the gate, prop=20) → low', () => {
    expect(deriveConfidence(20)).toBe('low')
    expect(deriveConfidence(30)).toBe('low')
  })

  it('D/E/F) several results → confidence from the top gate-passing score', () => {
    // "control de formulario" → form-field:225, input:63, checkbox:35 → high (top >= 100).
    // "campo inválido" → input:125 + checkbox/select:20 → high.
    // "selección" → checkbox:30, select:30 → low (top = 30).
    expect(deriveConfidence(225)).toBe('high')
    expect(deriveConfidence(125)).toBe('high')
    expect(deriveConfidence(30)).toBe('low')
  })

  it('G) a result barely above the gate → low', () => {
    expect(deriveConfidence(DEFAULT_MIN_SCORE)).toBe('low')
  })

  it('H) a very high score → high', () => {
    expect(deriveConfidence(250)).toBe('high')
  })

  it('confidence is deterministic for the same input', async () => {
    const first = await answerQuestion({
      provider: new LocalProvider('a'),
      question: '¿Cómo uso Button?',
    })
    const second = await answerQuestion({
      provider: new LocalProvider('b'),
      question: '¿Cómo uso Button?',
    })
    expect(first.confidence).toBe(second.confidence)
  })

  it('confidence does NOT depend on the provider output text', async () => {
    // Two providers returning completely different text: same retrieval →
    // same confidence.
    const short = await answerQuestion({
      provider: new LocalProvider('sí'),
      question: '¿Cómo uso Button?',
    })
    const long = await answerQuestion({
      provider: new LocalProvider('Sí, usa Button con variant primary...' + 'x'.repeat(500)),
      question: '¿Cómo uso Button?',
    })
    expect(short.confidence).toBe(long.confidence)
    expect(short.confidence).toBe('high')
  })

  it('confidence is explainable from retrieval scores', async () => {
    const answer = await answerQuestion({
      provider: new LocalProvider('x'),
      question: '¿Cómo uso Button?',
    })
    const topScore = answer.retrieval.components[0]!.score
    expect(deriveConfidence(topScore)).toBe(answer.confidence)
  })
})
