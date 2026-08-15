import { describe, expect, it, vi } from 'vitest'
import { answerQuestion } from '@ods-ai/ai-core'
import { NvidiaProvider } from './NvidiaProvider'
import type { ChatMessage } from '@ods-ai/ai-core'

/**
 * F7.1 §4 — Request audit: a fetch spy captures exactly what is sent to the
 * NVIDIA endpoint through the full chain (query → retrieval → gate →
 * context → prompt → provider). Demonstrates:
 * - URL, method, headers are correct; the API key appears ONLY in Authorization;
 * - messages are exactly the grounded messages (system prompt with grounding
 *   instructions + retrieved context from knowledge + user question);
 * - the context block contains the gate-passing component and no others;
 * - no sourcePath, local paths, node_modules, secrets or inherited props;
 * - defaults (temperature) are respected; no invented fields.
 *
 * (The exact "context === buildContext()" equality is asserted in ai-core's
 * invariants I2 — ai-providers cannot import knowledge by dependency rule.)
 */

const QUESTION = '¿Cómo uso Button?'

describe('F7.1 §4 — request to the provider', () => {
  it('sends the exact grounded request through answerQuestion', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      void _url
      void _init
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }], model: 'audit-model' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    const provider = new NvidiaProvider({
      apiKey: 'audit-key-xyz',
      model: 'audit-model',
      fetch: fetchMock as unknown as typeof fetch,
    })

    await answerQuestion({ provider, question: QUESTION })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = [
      String(fetchMock.mock.calls[0]?.[0]),
      fetchMock.mock.calls[0]?.[1] as RequestInit | undefined,
    ]

    // URL + method + headers.
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers.Authorization).toBe('Bearer audit-key-xyz')
    // The key appears only in Authorization: not in URL, not elsewhere in body.
    expect(url).not.toContain('audit-key-xyz')

    const body = JSON.parse(String(init?.body)) as {
      model: string
      messages: ChatMessage[]
      temperature: number
      stream: boolean
    }
    expect(body.model).toBe('audit-model')
    expect(body.temperature).toBe(0.2) // SPEC §7 default
    expect(body.stream).toBe(false)
    // No invented fields.
    expect(Object.keys(body).sort()).toEqual(['messages', 'model', 'stream', 'temperature'])

    // Messages: system (instructions + retrieved context) + user (question).
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0]?.role).toBe('system')
    expect(body.messages[1]?.role).toBe('user')
    expect(body.messages[1]?.content).toBe(QUESTION)

    const systemContent = body.messages[0]?.content ?? ''
    // Grounding instructions present.
    expect(systemContent).toContain('Never invent components')
    expect(systemContent).toContain('[RETRIEVED_CONTEXT]')
    expect(systemContent).toContain('[/RETRIEVED_CONTEXT]')

    // The retrieved context block contains the gate-passing component (button)
    // with its description, API and canonical example — and no other
    // component (only button passes the gate for this query).
    expect(systemContent).toContain('# Button (button)')
    expect(systemContent).toContain('Variants:')
    expect(systemContent).toContain('## Canonical examples')
    expect(systemContent).toContain('## API')
    expect(systemContent).not.toContain('# Input')
    expect(systemContent).not.toContain('# Select')
    expect(systemContent).not.toContain('# Checkbox')
    expect(systemContent).not.toContain('# Modal')
    expect(systemContent).not.toContain('# Badge')
    expect(systemContent).not.toContain('# Spinner')
    expect(systemContent).not.toContain('# FormField')

    // No internal repository data, no secrets.
    expect(systemContent).not.toContain('sourcePath')
    expect(systemContent).not.toContain('node_modules')
    expect(systemContent).not.toContain('packages/')
    expect(systemContent).not.toContain('/Users/')
    expect(systemContent).not.toContain('.tsx')
    expect(systemContent).not.toContain('audit-key-xyz')

    // No inherited HTML props in the API section: the only API entries are the
    // component's own props (variant, size, loading). aria-* prose in the
    // a11y summary (e.g. "loading usa aria-busy") is legitimate, so the check
    // targets the API list shape, not the word itself.
    expect(systemContent).not.toContain('- aria-label')
    expect(systemContent).not.toContain('- aria-describedby')
    expect(systemContent).not.toContain('- onClick')
    expect(systemContent).not.toContain('- data-')
    expect(systemContent).toContain('- variant: ButtonVariant')
    expect(systemContent).toContain('- size: ButtonSize')
    expect(systemContent).toContain('- loading: boolean')
  })

  it('temperature option is respected when passed', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      void _url
      void _init
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }], model: 'audit-model' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: fetchMock as unknown as typeof fetch,
    })
    await answerQuestion({ provider, question: QUESTION, options: { temperature: 0.7 } })
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { temperature: number }
    expect(body.temperature).toBe(0.7)
  })

  it('custom base URL is used when configured', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      void _url
      void _init
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }], model: 'm' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://nvidia.example/v1',
      fetch: fetchMock as unknown as typeof fetch,
    })
    await answerQuestion({ provider, question: QUESTION })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://nvidia.example/v1/chat/completions')
  })

  it('refusal path never sends a request at all', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('should not be called')
    })
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: fetchMock as unknown as typeof fetch,
    })
    const answer = await answerQuestion({ provider, question: 'Necesito un DatePicker' })
    expect(answer.hasRelevantContext).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
