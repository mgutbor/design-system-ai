import { describe, expect, it } from 'vitest'
import { answerQuestion } from '../index'
import { buildContext, corpus, retriever } from '@ods-ai/knowledge'
import type { AIProvider, AIResponse, ChatMessage } from '../types'

class LocalProvider implements AIProvider {
  readonly id = 'mock' as const
  async chat(): Promise<AIResponse> {
    return { content: 'ok', model: 'local-1', providerId: 'mock', finishReason: 'stop' }
  }
}

/** Captures the messages the provider receives. */
class CapturingProvider implements AIProvider {
  readonly id = 'mock' as const
  received: ChatMessage[][] = []
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    this.received.push(messages)
    return { content: 'ok', model: 'local-1', providerId: 'mock', finishReason: 'stop' }
  }
}

describe('multi-component context (F6.1 §6)', () => {
  it('1 component: context contains exactly that one', async () => {
    const answer = await answerQuestion({
      provider: new LocalProvider(),
      question: '¿Cómo uso Button?',
    })
    expect(answer.referencedComponents).toEqual(['button'])
  })

  it('2 components: "¿Qué componente acepta loading?" → spinner + button', async () => {
    const answer = await answerQuestion({
      provider: new LocalProvider(),
      question: '¿Qué componente acepta loading?',
    })
    expect(answer.referencedComponents.sort()).toEqual(['button', 'spinner'])
  })

  it('3 components: "¿Qué componentes tienen invalid?" → checkbox, input, select', async () => {
    const answer = await answerQuestion({
      provider: new LocalProvider(),
      question: '¿Qué componentes tienen invalid?',
    })
    expect(answer.referencedComponents.sort()).toEqual(['checkbox', 'input', 'select'])
  })

  it('ambiguous: "control de formulario" passes only gate-passing components', async () => {
    const answer = await answerQuestion({
      provider: new LocalProvider(),
      question: 'control de formulario',
    })
    const gated = new Set(
      retriever
        .search({ text: 'control de formulario' })
        .filter((r) => r.score >= 20)
        .map((r) => r.component),
    )
    for (const component of answer.referencedComponents) {
      expect(gated.has(component)).toBe(true)
    }
    // form-field (225) and input (63) are above the gate; checkbox (35) too.
    expect(gated.has('form-field')).toBe(true)
  })

  it('the context sent to the provider contains exactly the gated components', async () => {
    const provider = new CapturingProvider()
    await answerQuestion({ provider, question: '¿Qué componentes aceptan invalid?' })
    const systemContent = provider.received[0]![0]!.content
    // Every section header in the context corresponds to a gated component.
    const headers = [...systemContent.matchAll(/^# (.+) \(([^)]+)\)$/gm)].map((m) => m[2] ?? '')
    const gated = new Set(
      retriever
        .search({ text: '¿Qué componentes aceptan invalid?' })
        .filter((r) => r.score >= 20)
        .map((r) => r.component),
    )
    expect(headers.length).toBeGreaterThan(0)
    for (const header of headers) {
      expect(gated.has(header), `unexpected component ${header} in context`).toBe(true)
    }
  })

  it('buildContext is deterministic: same results → same context', () => {
    const results = retriever.search({ text: 'control de formulario' })
    const passing = results.filter((r) => r.score >= 20)
    expect(buildContext(passing, corpus)).toBe(buildContext(passing, corpus))
  })

  it('buildContext output is order-stable (sorted by slug)', () => {
    const results = retriever.search({ text: 'control de formulario' })
    const passing = results.filter((r) => r.score >= 20)
    const forward = buildContext(passing, corpus)
    const reversed = buildContext([...passing].reverse(), corpus)
    expect(forward).toBe(reversed)
  })

  it('different components with different examples are all present', async () => {
    const provider = new CapturingProvider()
    await answerQuestion({ provider, question: '¿Qué componentes aceptan invalid?' })
    const systemContent = provider.received[0]![0]!.content
    // Checkbox, Input and Select each have canonical examples in the context.
    expect(systemContent).toContain('# Checkbox')
    expect(systemContent).toContain('# Input')
    expect(systemContent).toContain('# Select')
    expect(systemContent).toContain('## Canonical examples')
  })
})
