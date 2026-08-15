import type { AIProvider, AIResponse, ChatMessage, ChatOptions, TokenUsage } from '@ods-ai/ai-core'

/**
 * NvidiaProvider (SPEC §4, ADR-004).
 *
 * The first real LLM provider, backed by NVIDIA Build (build.nvidia.com): an
 * OpenAI-compatible hosted API with a free tier. It implements exactly the
 * AIProvider port: ChatMessage[] → HTTP call → AIResponse. It never does
 * retrieval, never builds context, never modifies prompts, never decides
 * confidence and never invents references — those belong to ai-core/knowledge.
 *
 * Naming (F5 closure): previously DeepSeekProvider. The implementation was
 * already an OpenAI-compatible client, but the name coupled the provider to
 * DeepSeek's own API while the backend we actually use is NVIDIA Build. The
 * provider now represents the SERVICE (NVIDIA), and the model is pure
 * configuration (the default target is the DeepSeek V4 Flash model hosted by
 * NVIDIA — see NVIDIA_MODEL).
 *
 * Configuration comes exclusively from environment variables, validated at
 * construction (a misconfigured provider fails fast and deterministically):
 *
 * - NVIDIA_API_KEY   (required — generated at build.nvidia.com)
 * - NVIDIA_MODEL     (required — no hardcoded default in ai-core; suggested
 *   value: `deepseek-ai/deepseek-v4-flash-0731`, verified in the NVIDIA API
 *   catalog; changeable by configuration without touching ai-core)
 * - NVIDIA_BASE_URL  (optional, default: https://integrate.api.nvidia.com/v1 —
 *   the NVIDIA Build OpenAI-compatible endpoint; model is configurable)
 * - NVIDIA_TIMEOUT_MS (optional, default: 30000)
 *
 * Errors are typed (`NvidiaProviderError` with a stable `code`) so the HTTP
 * layer can map them to status codes. The public error never contains the API
 * key, request headers, request body, response body or internal stack traces.
 */

/** Stable machine-readable codes for provider failures (F7 §4). */
export type NvidiaErrorCode = 'timeout' | 'auth' | 'rate_limit' | 'unavailable' | 'invalid_response'

/** Typed provider error with a safe public message (never secrets). */
export class NvidiaProviderError extends Error {
  readonly code: NvidiaErrorCode

  constructor(code: NvidiaErrorCode, message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'NvidiaProviderError'
    this.code = code
  }
}

/** Constructor options (all optional — env vars are the source of truth). */
export interface NvidiaProviderOptions {
  apiKey?: string
  model?: string
  baseUrl?: string
  /** Request timeout in ms. Default: 30 000 (SPEC §7: timeout 30s). */
  timeoutMs?: number
  /** Injectable fetch for tests. Default: global fetch. */
  fetch?: typeof fetch
}

/** Default base URL: the NVIDIA Build OpenAI-compatible hosted endpoint. */
const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1'

export class NvidiaProvider implements AIProvider {
  readonly id = 'nvidia' as const

  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch

  constructor(options: NvidiaProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.NVIDIA_API_KEY
    const model = options.model ?? process.env.NVIDIA_MODEL
    const baseUrl = options.baseUrl ?? process.env.NVIDIA_BASE_URL ?? DEFAULT_BASE_URL

    if (!apiKey || apiKey.trim() === '') {
      throw new NvidiaProviderError(
        'auth',
        'NvidiaProvider is misconfigured: NVIDIA_API_KEY is missing or empty.',
      )
    }
    if (!model || model.trim() === '') {
      throw new NvidiaProviderError(
        'invalid_response',
        'NvidiaProvider is misconfigured: NVIDIA_MODEL is missing or empty. ' +
          'Set it to a model from the NVIDIA API catalog (e.g. deepseek-ai/deepseek-v4-flash-0731).',
      )
    }

    this.apiKey = apiKey
    this.model = model
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.timeoutMs = options.timeoutMs ?? 30_000
    this.fetchImpl = options.fetch ?? globalThis.fetch
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    const externalSignal = options?.signal

    const abort = () => controller.abort()
    externalSignal?.addEventListener('abort', abort, { once: true })

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.2,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (response.status === 401 || response.status === 403) {
        throw new NvidiaProviderError(
          'auth',
          'NVIDIA API rejected the credentials (401/403). Check NVIDIA_API_KEY.',
        )
      }
      if (response.status === 429) {
        throw new NvidiaProviderError('rate_limit', 'NVIDIA API rate limit exceeded (429).')
      }
      if (response.status >= 500) {
        throw new NvidiaProviderError(
          'unavailable',
          `NVIDIA API is unavailable (HTTP ${response.status}).`,
        )
      }
      if (!response.ok) {
        // Any other 4xx: upstream refused the request. Never leak the body.
        throw new NvidiaProviderError(
          'unavailable',
          `NVIDIA API returned an unexpected status (HTTP ${response.status}).`,
        )
      }

      return await this.parseResponse(response)
    } catch (error) {
      if (error instanceof NvidiaProviderError) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NvidiaProviderError('timeout', `NVIDIA API timed out after ${this.timeoutMs}ms.`)
      }
      // Network errors, JSON parse errors, etc. Safe message, cause preserved.
      throw new NvidiaProviderError(
        'invalid_response',
        'NVIDIA API request failed unexpectedly.',
        error,
      )
    } finally {
      clearTimeout(timeout)
      externalSignal?.removeEventListener('abort', abort)
    }
  }

  private async parseResponse(response: Response): Promise<AIResponse> {
    let data: unknown
    try {
      data = await response.json()
    } catch (error) {
      throw new NvidiaProviderError(
        'invalid_response',
        'NVIDIA API returned an invalid (non-JSON) response.',
        error,
      )
    }

    const choices = (data as { choices?: unknown }).choices
    const first = Array.isArray(choices)
      ? (choices[0] as { message?: { content?: unknown } } | undefined)
      : undefined
    const content = first?.message?.content
    const model = (data as { model?: unknown }).model

    if (typeof content !== 'string') {
      throw new NvidiaProviderError(
        'invalid_response',
        'NVIDIA API response has no usable content (missing choices/message/content).',
      )
    }
    if (typeof model !== 'string' || model.trim() === '') {
      throw new NvidiaProviderError(
        'invalid_response',
        'NVIDIA API response is missing the model field.',
      )
    }

    return {
      content,
      model,
      providerId: 'nvidia',
      usage: this.parseUsage((data as { usage?: unknown }).usage),
      finishReason: 'stop',
    }
  }

  private parseUsage(usage: unknown): TokenUsage | undefined {
    if (typeof usage !== 'object' || usage === null) return undefined
    const u = usage as {
      prompt_tokens?: unknown
      completion_tokens?: unknown
      total_tokens?: unknown
    }
    const num = (v: unknown): number | undefined =>
      typeof v === 'number' && Number.isFinite(v) ? v : undefined
    return {
      promptTokens: num(u.prompt_tokens),
      completionTokens: num(u.completion_tokens),
      totalTokens: num(u.total_tokens),
    }
  }
}
