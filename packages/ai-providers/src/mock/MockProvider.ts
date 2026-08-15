import type { AIProvider, AIResponse, ChatMessage, ChatOptions } from '@ods-ai/ai-core'

/**
 * MockProvider (SPEC §4, F6 §3).
 *
 * Deterministic, offline provider used for tests, CI and local development:
 * no API key, no internet, no external service, no model.
 *
 * It does not simulate intelligence: it reflects the user's question back in a
 * stable, predictable envelope so the whole chain
 * query → retrieval → context → AI Core → provider → response
 * can be tested end-to-end without any external dependency.
 */
export class MockProvider implements AIProvider {
  readonly id = 'mock' as const

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user')
    const question = userMessage?.content ?? ''
    const systemCount = messages.filter((message) => message.role === 'system').length

    // Deterministic: identical input always yields identical output.
    const content =
      `[mock] Pregunta recibida: "${question}". ` +
      `Sistema: ${systemCount} mensaje(s) system. ` +
      `Temperatura: ${options?.temperature ?? 'default'}. ` +
      '(Respuesta determinista del MockProvider — sin llamada a un modelo externo.)'

    return {
      content,
      model: 'mock-1',
      providerId: 'mock',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
    }
  }
}

/** Shared singleton for convenience. */
export const mockProvider = new MockProvider()
