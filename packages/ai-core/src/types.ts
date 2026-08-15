/**
 * Public contracts of the AI layer (SPEC §4, ADR-004).
 *
 * ai-core is the provider-agnostic seam: it defines the AIProvider port and
 * orchestrates the grounded flow (query → retrieval → context → prompt →
 * provider → answer). It never imports a concrete provider and never knows
 * React, tokens or metadata — the retrieved context is the only knowledge the
 * LLM ever sees.
 */

/** Roles of a chat message (SPEC §4). */
export type ChatRole = 'system' | 'user' | 'assistant'

/** A single chat message. */
export interface ChatMessage {
  role: ChatRole
  content: string
}

/** Optional provider call options. */
export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  /** AbortSignal for future streaming/cancellation (not used in F6). */
  signal?: AbortSignal
}

/** Token usage of a provider response. */
export interface TokenUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

/** Provider finish reason (SPEC §4). */
export type FinishReason = 'stop' | 'length' | 'aborted' | 'error'

/** Identifiers of supported providers (SPEC §4: nvidia + mock). */
export type AIProviderId = 'nvidia' | 'mock'

/**
 * The AI provider port (SPEC §4). A provider is a pure message → response
 * function: it knows nothing about React, tokens, metadata, retrieval or UI.
 */
export interface AIProvider {
  readonly id: AIProviderId
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>
}

/** Structured provider response (SPEC §4). */
export interface AIResponse {
  content: string
  model: string
  providerId: AIProviderId
  usage?: TokenUsage
  finishReason: FinishReason
}

/** Confidence of an AI Core answer, derived deterministically from retrieval. */
export type Confidence = 'none' | 'low' | 'medium' | 'high'

/** Retrieval trace included in every answer for observability (F6 §14). */
export interface RetrievalTrace {
  query: string
  /** Components that passed the gate (score >= minScore), with their scores. */
  components: Array<{ component: string; score: number }>
  /** Minimum score used for the gate. */
  minScore: number
}

/**
 * Structured answer of AI Core (F6 §8). The consumer never needs to know
 * provider internals.
 */
export interface AIAnswer {
  /** The answer text (grounded in the retrieved context). */
  answer: string
  /**
   * Components referenced by the answer — taken exclusively from retrieval
   * (ADR-004 rule 3): the LLM never decides which sources are cited.
   */
  referencedComponents: string[]
  /** Deterministic confidence derived from the retrieval scores. */
  confidence: Confidence
  /** False when the gate found no relevant context (refusal answer). */
  hasRelevantContext: boolean
  providerId: AIProviderId
  model: string
  /** Observability: what was retrieved and the gate that was applied. */
  retrieval: RetrievalTrace
}

/** Options of the "ask about the design system" use case. */
export interface AskOptions {
  /** Number of retrieval results considered. Default: 3. */
  topK?: number
  /** Gate threshold (absolute score of the F5 retriever). Default: 20 (F6.1 audit). */
  minScore?: number
  /** Provider temperature. Default: 0.2 (SPEC §7). */
  temperature?: number
}
