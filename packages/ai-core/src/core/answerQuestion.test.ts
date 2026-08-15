import { describe, expect, it } from 'vitest'
import { corpus, retriever } from '@ods-ai/knowledge'
import {
  AIProviderError,
  answerQuestion,
  buildGroundedMessages,
  NO_RELEVANT_CONTEXT_MESSAGE,
} from '../index'
import type { AIProvider, AIResponse, ChatMessage, ChatOptions } from '../types'

/**
 * Fake provider implementing only the AIProvider interface: proves AI Core
 * works against the port, not against a concrete implementation (F6 §10B).
 */
class FakeProvider implements AIProvider {
  readonly id = 'mock' as const
  calls: ChatMessage[][] = []

  constructor(
    private readonly behavior: 'ok' | 'fail' = 'ok',
    private readonly responseContent = 'Respuesta del fake provider.',
  ) {}

  async chat(messages: ChatMessage[], _options?: ChatOptions): Promise<AIResponse> {
    void _options
    this.calls.push(messages)
    if (this.behavior === 'fail') {
      throw new Error('provider exploded')
    }
    return {
      content: this.responseContent,
      model: 'fake-1',
      providerId: 'mock',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      finishReason: 'stop',
    }
  }
}

describe('answerQuestion — AI Core (F6 §4)', () => {
  it('A) answers a valid question through retrieval → context → provider', async () => {
    const provider = new FakeProvider()
    const answer = await answerQuestion({
      provider,
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.hasRelevantContext).toBe(true)
    expect(answer.referencedComponents).toEqual(['button'])
    expect(answer.answer).toBe('Respuesta del fake provider.')
    expect(answer.confidence).not.toBe('none')
    expect(answer.model).toBe('fake-1')
    // The provider was called with grounded messages.
    expect(provider.calls).toHaveLength(1)
    const messages = provider.calls[0]!
    expect(messages[0]?.role).toBe('system')
    expect(messages[0]?.content).toContain('[RETRIEVED_CONTEXT]')
    expect(messages[1]?.role).toBe('user')
  })

  it('B) returns a deterministic refusal and never calls the provider without context', async () => {
    const provider = new FakeProvider()
    const answer = await answerQuestion({
      provider,
      question: 'Necesito un DatePicker',
      retriever,
      corpus,
    })
    expect(answer.hasRelevantContext).toBe(false)
    expect(answer.answer).toBe(NO_RELEVANT_CONTEXT_MESSAGE)
    expect(answer.referencedComponents).toEqual([])
    expect(answer.confidence).toBe('none')
    // The LLM must not be called when there is no documentation.
    expect(provider.calls).toHaveLength(0)
  })

  it('B2) refusal is the same for any irrelevant question (deterministic, no invention)', async () => {
    const provider = new FakeProvider()
    const auth = await answerQuestion({
      provider,
      question: '¿Cómo implemento autenticación?',
      retriever,
      corpus,
    })
    const api = await answerQuestion({
      provider,
      question: '¿Cómo hago una API REST?',
      retriever,
      corpus,
    })
    expect(auth.hasRelevantContext).toBe(false)
    expect(api.hasRelevantContext).toBe(false)
    expect(provider.calls).toHaveLength(0)
  })

  it('C) returns the provider response as the answer', async () => {
    const provider = new FakeProvider(
      'ok',
      'Button tiene variantes primary, secondary, ghost y destructive.',
    )
    const answer = await answerQuestion({
      provider,
      question: '¿Qué variantes tiene Button?',
      retriever,
      corpus,
    })
    expect(answer.answer).toBe('Button tiene variantes primary, secondary, ghost y destructive.')
  })

  it('D) provider failure produces a structured error, never a silent crash', async () => {
    const provider = new FakeProvider('fail')
    await expect(
      answerQuestion({ provider, question: '¿Cómo uso Button?', retriever, corpus }),
    ).rejects.toBeInstanceOf(AIProviderError)
    await expect(
      answerQuestion({ provider, question: '¿Cómo uso Button?', retriever, corpus }),
    ).rejects.toMatchObject({ providerId: 'mock', message: expect.stringContaining('mock') })
  })

  it('E) multiple retrieved components are reported (citations come from retrieval)', async () => {
    const provider = new FakeProvider()
    const answer = await answerQuestion({
      provider,
      question: 'control de formulario',
      retriever,
      corpus,
    })
    expect(answer.hasRelevantContext).toBe(true)
    expect(answer.referencedComponents.length).toBeGreaterThan(1)
    // Every referenced component must be a real corpus component.
    const known = new Set(corpus.map((entry) => entry.component))
    for (const component of answer.referencedComponents) {
      expect(known.has(component)).toBe(true)
    }
  })

  it('F) empty context behaves exactly like no results', async () => {
    const provider = new FakeProvider()
    const answer = await answerQuestion({
      provider,
      question: 'zzz nada que ver',
      retriever,
      corpus,
    })
    expect(answer.hasRelevantContext).toBe(false)
    expect(provider.calls).toHaveLength(0)
  })

  it('anti-hallucination: "Necesito un DatePicker" never suggests a DatePicker API', async () => {
    const provider = new FakeProvider()
    const answer = await answerQuestion({
      provider,
      question: 'Necesito un DatePicker',
      retriever,
      corpus,
    })
    expect(answer.hasRelevantContext).toBe(false)
    expect(answer.answer).not.toMatch(/Usa DatePicker|DatePicker prop|date-picker/i)
    expect(answer.answer).toMatch(/no existe documentación relevante/i)
  })

  it('context isolation: the provider only receives knowledge-built context', async () => {
    const provider = new FakeProvider()
    await answerQuestion({ provider, question: '¿Cómo uso Button?', retriever, corpus })
    const systemContent = provider.calls[0]![0]!.content
    // The context comes from knowledge/buildContext: no filesystem, no source
    // code paths, no raw metadata dump, no inherited HTML props.
    expect(systemContent).toContain('[RETRIEVED_CONTEXT]')
    expect(systemContent).toContain('# Button')
    expect(systemContent).toContain('/components/button')
    expect(systemContent).not.toContain('node_modules')
    expect(systemContent).not.toContain('packages/react/src')
    expect(systemContent).not.toContain('aria-label')
    expect(systemContent).not.toContain('onClickCapture')
  })

  it('the gate only injects sources that reach minScore', async () => {
    const provider = new FakeProvider()
    // "campo inválido" → input (100), checkbox/select (20). With minScore 50
    // only input passes the gate.
    const answer = await answerQuestion({
      provider,
      question: 'campo inválido',
      retriever,
      corpus,
      options: { minScore: 50 },
    })
    expect(answer.referencedComponents).toEqual(['input'])
    expect(answer.retrieval.minScore).toBe(50)
  })

  it('works against the port: any AIProvider implementation is interchangeable', async () => {
    // Two independent implementations of the same port behave identically
    // through the same AI Core orchestration.
    const first = await answerQuestion({
      provider: new FakeProvider('ok', 'A'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    const second = await answerQuestion({
      provider: new FakeProvider('ok', 'A'),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(first.hasRelevantContext).toBe(true)
    expect(second.hasRelevantContext).toBe(true)
    expect(first.referencedComponents).toEqual(second.referencedComponents)
  })

  it('is deterministic: same input yields the same answer', async () => {
    const first = await answerQuestion({
      provider: new FakeProvider(),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    const second = await answerQuestion({
      provider: new FakeProvider(),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(first).toEqual(second)
  })

  it('exposes the retrieval trace for observability (no secrets)', async () => {
    const answer = await answerQuestion({
      provider: new FakeProvider(),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.retrieval.query).toBe('¿Cómo uso Button?')
    expect(answer.retrieval.components[0]).toMatchObject({
      component: 'button',
      score: expect.any(Number),
    })
    expect(answer.retrieval.minScore).toBeGreaterThan(0)
  })

  it('never lets the model access the repository (grounded-only prompt)', async () => {
    // The prompt the provider receives is built solely from buildContext:
    // buildGroundedMessages is the only message construction used by AI Core.
    const provider = new FakeProvider()
    await answerQuestion({ provider, question: '¿Qué tokens utiliza Modal?', retriever, corpus })
    const [system] = provider.calls[0]!
    const [expectedSystem] = buildGroundedMessages('¿Qué tokens utiliza Modal?', 'context')
    // Same structure: system instructions + delimited context + user question.
    expect(
      system!.content.startsWith(expectedSystem!.content.split('[RETRIEVED_CONTEXT]')[0]!),
    ).toBe(true)
  })
})
