import {
  buildContext,
  corpus as defaultCorpus,
  retriever as defaultRetriever,
  type ComponentKnowledge,
  type Retriever,
} from '@ods-ai/knowledge'
import { buildGroundedMessages, NO_RELEVANT_CONTEXT_MESSAGE } from '../prompt/buildGroundedMessages'
import { validateProviderResponse } from './validateProviderResponse'
import type { AIAnswer, AIProvider, AIResponse, AskOptions, Confidence } from '../types'

/**
 * Structured error thrown when a provider call fails. Never a silent crash:
 * the caller receives a typed error with the provider that failed.
 */
export class AIProviderError extends Error {
  readonly providerId: string

  constructor(providerId: string, message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'AIProviderError'
    this.providerId = providerId
  }
}

/**
 * Default gate threshold (absolute retriever score, see docs/ai-core.md).
 *
 * F6.1 audit: set to 20 so that prop matches (propExact = 20) pass the gate.
 * Demonstrated case: "¿Qué componentes tienen invalid?" retrieves
 * checkbox/input/select with score 20 (the `invalid` own prop); with a
 * threshold of 25 the gate rejected it, producing a refusal for a query that
 * the F5.1 evaluation dataset marks as correct. 20 keeps strong domain
 * signals (name 100/60, tag 30, variant 25, prop 20) and still excludes weak
 * ones (token 10, description/a11y 5, example 3).
 */
export const DEFAULT_MIN_SCORE = 20
/** Default retrieval top-K. */
export const DEFAULT_TOP_K = 3
/** Default provider temperature (SPEC §7). */
export const DEFAULT_TEMPERATURE = 0.2

/** Derives a deterministic confidence from the top gate-passing score. */
export function deriveConfidence(topScore: number | undefined): Confidence {
  if (topScore === undefined) return 'none'
  if (topScore >= 100) return 'high'
  if (topScore >= 50) return 'medium'
  return 'low'
}

export interface AskDesignSystemInput {
  provider: AIProvider
  question: string
  /** Injectable for tests; defaults to the real knowledge retriever. */
  retriever?: Retriever
  /** Injectable for tests; defaults to the real knowledge corpus. */
  corpus?: ComponentKnowledge[]
  options?: AskOptions
}

/**
 * The "ask about the design system" use case (F6 §9).
 *
 * 1. retrieval (deterministic, knowledge)
 * 2. gate minScore (deterministic): only sources with score >= minScore pass
 * 3. no sources → deterministic refusal, NO provider call (SPEC §7 / ADR-004)
 * 4. context = buildContext(gate-passing sources)
 * 5. messages = buildGroundedMessages(question, context)
 * 6. provider.chat(messages) — the ONLY AI part
 * 7. structured AIAnswer
 */
export async function answerQuestion(input: AskDesignSystemInput): Promise<AIAnswer> {
  const { provider, question } = input
  const retriever = input.retriever ?? defaultRetriever
  const corpus = input.corpus ?? defaultCorpus
  const topK = input.options?.topK ?? DEFAULT_TOP_K
  const minScore = input.options?.minScore ?? DEFAULT_MIN_SCORE
  const temperature = input.options?.temperature ?? DEFAULT_TEMPERATURE

  // 1 + 2. Retrieval and gate (both deterministic, no AI).
  const results = retriever.search({ text: question, topK })
  const passing = results.filter((result) => result.score >= minScore)
  const hasRelevantContext = passing.length > 0

  if (!hasRelevantContext) {
    // 3. Refusal: never call the LLM without retrieved documentation.
    return {
      answer: NO_RELEVANT_CONTEXT_MESSAGE,
      referencedComponents: [],
      confidence: 'none',
      hasRelevantContext: false,
      providerId: provider.id,
      model: '',
      retrieval: {
        query: question,
        // F6.1: `components` always means the gate-passing set (here: none),
        // consistent with the success branch. The full pre-gate retrieval is
        // available to callers via `retriever.search()` if needed.
        components: [],
        minScore,
      },
    }
  }

  // 4 + 5. Build the grounded context and messages (deterministic).
  const context = buildContext(passing, corpus)
  const messages = buildGroundedMessages(question, context)

  // 6. The only AI part. Errors are structured, never silent; a structurally
  // invalid response (e.g. non-string content) is treated as a provider error,
  // never as a seemingly valid answer (F6.1 §5-H).
  let response: AIResponse
  try {
    response = await provider.chat(messages, { temperature })
    validateProviderResponse(response)
  } catch (error) {
    throw new AIProviderError(
      provider.id,
      `Provider "${provider.id}" failed while answering the question.`,
      error,
    )
  }

  const topScore = passing[0]?.score

  // 7. Structured answer. Citations come exclusively from retrieval.
  return {
    answer: response.content,
    referencedComponents: passing.map((result) => result.component),
    confidence: deriveConfidence(topScore),
    hasRelevantContext: true,
    providerId: response.providerId,
    model: response.model,
    retrieval: {
      query: question,
      components: passing.map((result) => ({
        component: result.component,
        score: result.score,
      })),
      minScore,
    },
  }
}
