import type { AIResponse } from '../types'

/**
 * Minimal contract validation of a provider response (F6.1 §5-H).
 *
 * Demonstrated bug: a provider returning `{ content: 42 }` produced
 * `answer: 42` — a seemingly valid answer from a structurally invalid
 * response. This validator rejects responses that do not satisfy the
 * AIResponse contract at the observable field (`content` must be a string).
 * It is deliberately minimal: it does NOT build a full LLM output validator
 * (F6.1 §5: "no conviertas esto todavía en un sistema completo de validación").
 */
export function validateProviderResponse(response: unknown): asserts response is AIResponse {
  if (typeof response !== 'object' || response === null) {
    throw new TypeError('Provider returned a non-object response')
  }
  const candidate = response as Partial<AIResponse>
  if (typeof candidate.content !== 'string') {
    throw new TypeError(
      `Provider returned content of type "${typeof candidate.content}", expected string`,
    )
  }
}
