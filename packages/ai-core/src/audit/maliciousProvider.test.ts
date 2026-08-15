import { describe, expect, it } from 'vitest'
import { AIProviderError, answerQuestion } from '../index'
import { corpus, retriever } from '@ods-ai/knowledge'
import type { AIProvider, AIResponse, FinishReason, TokenUsage } from '../types'

class ScriptedProvider implements AIProvider {
  readonly id = 'mock' as const
  constructor(
    private readonly script:
      | { kind: 'ok'; content: string; finishReason?: FinishReason; usage?: TokenUsage }
      | { kind: 'throw'; error: unknown }
      | { kind: 'reject'; error: unknown }
      | { kind: 'invalid' },
  ) {}
  async chat(): Promise<AIResponse> {
    const script = this.script
    if (script.kind === 'throw') throw script.error
    if (script.kind === 'reject') return Promise.reject(script.error)
    if (script.kind === 'invalid') return { content: 42 } as unknown as AIResponse
    return {
      content: script.content,
      model: 'scripted-1',
      providerId: 'mock',
      usage: script.usage,
      finishReason: script.finishReason ?? 'stop',
    }
  }
}

describe('malicious/broken provider (F6.1 §5)', () => {
  it('A) normal response → normal answer', async () => {
    const answer = await answerQuestion({
      provider: new ScriptedProvider({ kind: 'ok', content: 'respuesta normal' }),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.answer).toBe('respuesta normal')
    expect(answer.hasRelevantContext).toBe(true)
  })

  it('B) empty response → empty answer (pass-through, no crash)', async () => {
    const answer = await answerQuestion({
      provider: new ScriptedProvider({ kind: 'ok', content: '' }),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.answer).toBe('')
    expect(answer.hasRelevantContext).toBe(true)
    // Grounding state is preserved even with an empty generation.
    expect(answer.referencedComponents).toEqual(['button'])
  })

  it('C) invented text → answer carries it but refs stay grounded', async () => {
    const answer = await answerQuestion({
      provider: new ScriptedProvider({ kind: 'ok', content: 'Usa DatePicker y Card.' }),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.answer).toContain('DatePicker') // raw text is passed through
    expect(answer.referencedComponents).toEqual(['button']) // refs stay grounded
  })

  it('D) unexpected finishReason → accepted as-is, no crash', async () => {
    const answer = await answerQuestion({
      provider: new ScriptedProvider({ kind: 'ok', content: 'x', finishReason: 'length' }),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.answer).toBe('x')
    expect(answer.hasRelevantContext).toBe(true)
  })

  it('E) invalid usage → no crash, answer still valid', async () => {
    const answer = await answerQuestion({
      provider: new ScriptedProvider({
        kind: 'ok',
        content: 'x',
        usage: { promptTokens: -5 } as unknown as TokenUsage,
      }),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.answer).toBe('x')
  })

  it('F) provider throws → structured AIProviderError, never a fake success', async () => {
    await expect(
      answerQuestion({
        provider: new ScriptedProvider({ kind: 'throw', error: new Error('boom') }),
        question: '¿Cómo uso Button?',
        retriever,
        corpus,
      }),
    ).rejects.toBeInstanceOf(AIProviderError)
  })

  it('F2) provider rejects the promise → structured AIProviderError', async () => {
    await expect(
      answerQuestion({
        provider: new ScriptedProvider({ kind: 'reject', error: new Error('nope') }),
        question: '¿Cómo uso Button?',
        retriever,
        corpus,
      }),
    ).rejects.toBeInstanceOf(AIProviderError)
  })

  it('F3) error never becomes a seemingly valid answer', async () => {
    // The refusal path and the error path are disjoint: a thrown error rejects,
    // it is never converted into an AIAnswer with hasRelevantContext=true.
    const promise = answerQuestion({
      provider: new ScriptedProvider({ kind: 'throw', error: new Error('boom') }),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    let resolved = false
    try {
      await promise
      resolved = true
    } catch {
      resolved = false
    }
    expect(resolved).toBe(false)
  })

  it('G) extremely long response → passed through, no crash', async () => {
    const long = 'a'.repeat(50_000)
    const answer = await answerQuestion({
      provider: new ScriptedProvider({ kind: 'ok', content: long }),
      question: '¿Cómo uso Button?',
      retriever,
      corpus,
    })
    expect(answer.answer.length).toBe(50_000)
  })

  it('H) provider returning a structurally invalid response → rejects (no silent success)', async () => {
    await expect(
      answerQuestion({
        provider: new ScriptedProvider({ kind: 'invalid' }),
        question: '¿Cómo uso Button?',
        retriever,
        corpus,
      }),
    ).rejects.toBeInstanceOf(Error)
  })
})
