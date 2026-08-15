import { describe, expect, it } from 'vitest'
import { answerQuestion } from '../index'
import { corpus, retriever } from '@ods-ai/knowledge'
import type { AIProvider, AIResponse } from '../types'

/** Provider that tries to mention components that do not exist. */
class HallucinatingProvider implements AIProvider {
  readonly id = 'mock' as const
  constructor(private readonly content: string) {}
  async chat(): Promise<AIResponse> {
    return {
      content: this.content,
      model: 'hallucinator-1',
      providerId: 'mock',
      finishReason: 'stop',
    }
  }
}

const KNOWN_COMPONENTS = new Set(corpus.map((entry) => entry.component))

describe('anti-hallucination of referencedComponents (F6.1 §3)', () => {
  it('referencedComponents cannot contain a non-existent component', async () => {
    const answer = await answerQuestion({
      provider: new HallucinatingProvider('Para hacer esto utiliza DatePicker.'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.referencedComponents).not.toContain('date-picker')
    expect(answer.referencedComponents).not.toContain('DatePicker')
    // Only the gated component.
    expect(answer.referencedComponents).toEqual(['button'])
  })

  it('cannot be contaminated with Card, Tabs or Toast', async () => {
    const answer = await answerQuestion({
      provider: new HallucinatingProvider('Puedes usar Card, Tabs y Toast.'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    for (const component of answer.referencedComponents) {
      expect(KNOWN_COMPONENTS.has(component)).toBe(true)
    }
    expect(answer.referencedComponents).toEqual(['button'])
  })

  it('mixed case: only Button is real, DatePicker is excluded', async () => {
    const answer = await answerQuestion({
      provider: new HallucinatingProvider('Usa Button y DatePicker.'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.referencedComponents).toEqual(['button'])
  })

  it('the provider output never leaks into referencedComponents', async () => {
    // The provider's text is free-form; the structured field is derived ONLY
    // from retrieval. Any provider text is ignored for citations.
    const answer = await answerQuestion({
      provider: new HallucinatingProvider('nonsense X Y Z totally invented'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.referencedComponents).toEqual(['button'])
    expect(answer.referencedComponents).not.toContain('x')
    expect(answer.referencedComponents).not.toContain('y')
  })

  it('every referenced component is in the gate-passing set (subset invariant)', async () => {
    const answer = await answerQuestion({
      provider: new HallucinatingProvider('algo'),
      question: 'control de formulario',
      retriever,
      corpus,
    })
    const gated = new Set(
      retriever
        .search({ text: 'control de formulario' })
        .filter((r) => r.score >= 20)
        .map((r) => r.component),
    )
    expect(answer.referencedComponents.length).toBeGreaterThan(0)
    for (const component of answer.referencedComponents) {
      expect(gated.has(component)).toBe(true)
    }
  })

  it('programmatic guarantee: AIAnswer construction never reads provider text for refs', () => {
    // Structural proof: the only field built from the provider response is
    // answer/model/providerId/finishReason. referencedComponents is built
    // exclusively from the gated retrieval results. This test re-checks the
    // observable contract: changing provider text never changes the refs.
    const a = answerQuestion({
      provider: new HallucinatingProvider('AAA'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    const b = answerQuestion({
      provider: new HallucinatingProvider('BBB totally different'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    return Promise.all([a, b]).then(([ansA, ansB]) => {
      expect(ansA.referencedComponents).toEqual(ansB.referencedComponents)
    })
  })
})
