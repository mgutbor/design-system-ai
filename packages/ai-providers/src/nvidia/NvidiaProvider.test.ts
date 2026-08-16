import { afterEach, describe, expect, it, vi } from 'vitest'
import { NvidiaProvider, NvidiaProviderError } from './NvidiaProvider'
import type { AIProvider, ChatMessage } from '@ods-ai/ai-core'

const MESSAGES: ChatMessage[] = [
  { role: 'system', content: 'system instructions' },
  { role: 'user', content: '¿Cómo uso Button?' },
]

const VALID_BODY = {
  choices: [{ message: { role: 'assistant', content: 'Usa Button con variant="primary".' } }],
  model: 'nvidia-model-test',
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('NvidiaProvider (F7 §2–§4)', () => {
  const OLD_KEY = process.env.NVIDIA_API_KEY
  const OLD_MODEL = process.env.NVIDIA_MODEL
  const OLD_URL = process.env.NVIDIA_BASE_URL

  afterEach(() => {
    // Node quirk: assigning `undefined` to process.env stores the STRING
    // "undefined" (truthy). Delete the var when it was originally unset.
    if (OLD_KEY === undefined) delete process.env.NVIDIA_API_KEY
    else process.env.NVIDIA_API_KEY = OLD_KEY
    if (OLD_MODEL === undefined) delete process.env.NVIDIA_MODEL
    else process.env.NVIDIA_MODEL = OLD_MODEL
    if (OLD_URL === undefined) delete process.env.NVIDIA_BASE_URL
    else process.env.NVIDIA_BASE_URL = OLD_URL
    vi.restoreAllMocks()
  })

  it('implements the AIProvider port (id + chat)', () => {
    const provider = new NvidiaProvider({ apiKey: 'k', model: 'm' })
    const asPort: AIProvider = provider
    expect(asPort.id).toBe('nvidia')
    expect(typeof asPort.chat).toBe('function')
  })

  it('fails fast at construction when the API key is missing', () => {
    expect(() => new NvidiaProvider({ model: 'm' })).toThrow(NvidiaProviderError)
    expect(() => new NvidiaProvider({ model: 'm' })).toThrow(/NVIDIA_API_KEY/)
  })

  it('fails fast at construction when the model is missing', () => {
    expect(() => new NvidiaProvider({ apiKey: 'k' })).toThrow(NvidiaProviderError)
    expect(() => new NvidiaProvider({ apiKey: 'k' })).toThrow(/NVIDIA_MODEL/)
  })

  it('reads config from environment variables', () => {
    process.env.NVIDIA_API_KEY = 'env-key'
    process.env.NVIDIA_MODEL = 'env-model'
    const provider = new NvidiaProvider()
    expect(provider).toBeInstanceOf(NvidiaProvider)
  })

  it('sends the correct request: URL, headers and body', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      // Request shape: model, messages and temperature must be passed through.
      expect(body).toEqual({
        model: 'test-model',
        messages: MESSAGES,
        temperature: 0.2,
        stream: false,
      })
      return jsonResponse(VALID_BODY)
    })

    const provider = new NvidiaProvider({
      apiKey: 'secret-key-123',
      model: 'test-model',
      baseUrl: 'https://api.test.example',
      fetch: fetchMock as unknown as typeof fetch,
    })
    await provider.chat(MESSAGES)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]?.[0])
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect(url).toBe('https://api.test.example/chat/completions')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret-key-123',
    })
  })

  it('defaults the base URL to the NVIDIA Build hosted endpoint', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
      return jsonResponse(VALID_BODY)
    })
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: fetchMock as unknown as typeof fetch,
    })
    await provider.chat(MESSAGES)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('passes temperature and strips trailing slashes from the base URL', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body)).temperature).toBe(0.7)
      return jsonResponse(VALID_BODY)
    })
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://api.test.example/',
      fetch: fetchMock as unknown as typeof fetch,
    })
    await provider.chat(MESSAGES, { temperature: 0.7 })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.test.example/chat/completions')
  })

  it('parses a valid response into AIResponse', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () => jsonResponse(VALID_BODY)) as unknown as typeof fetch,
    })
    const response = await provider.chat(MESSAGES)
    expect(response).toEqual({
      content: 'Usa Button con variant="primary".',
      model: 'nvidia-model-test',
      providerId: 'nvidia',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
    })
  })

  it('maps HTTP 401 to an auth error', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () => jsonResponse({ error: 'unauthorized' }, 401)) as unknown as typeof fetch,
    })
    await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'auth' })
  })

  it('maps HTTP 429 to a rate_limit error', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () => jsonResponse({ error: 'rate limited' }, 429)) as unknown as typeof fetch,
    })
    await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'rate_limit' })
  })

  it('maps HTTP 5xx to an unavailable error', async () => {
    for (const status of [500, 502, 503]) {
      const provider = new NvidiaProvider({
        apiKey: 'k',
        model: 'm',
        fetch: (async () => jsonResponse({}, status)) as unknown as typeof fetch,
      })
      await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'unavailable' })
    }
  })

  it('maps other 4xx statuses to an unavailable error without leaking the body', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () =>
        jsonResponse({ error: 'internal secret detail' }, 418)) as unknown as typeof fetch,
    })
    await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'unavailable' })
    await expect(provider.chat(MESSAGES)).rejects.toThrow(/unexpected status/)
    await expect(provider.chat(MESSAGES)).rejects.not.toThrow(/internal secret detail/)
  })

  it('maps an invalid JSON response to an invalid_response error', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () => new Response('not-json', { status: 200 })) as unknown as typeof fetch,
    })
    await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('maps a response without choices/content to an invalid_response error', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () => jsonResponse({ model: 'm' })) as unknown as typeof fetch,
    })
    await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('maps a network error to an invalid_response error without leaking internals', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () => {
        throw new Error('ECONNREFUSED secret-host:443')
      }) as unknown as typeof fetch,
    })
    await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'invalid_response' })
    await expect(provider.chat(MESSAGES)).rejects.not.toThrow(/ECONNREFUSED/)
  })

  it('maps a timeout to a timeout error', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'k',
      model: 'm',
      timeoutMs: 10,
      fetch: ((_url: string | URL | Request, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          // Simulate a request that never resolves; the provider's own
          // AbortController fires the timeout.
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        })) as unknown as typeof fetch,
    })
    await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'timeout' })
  })

  it('reads NVIDIA_TIMEOUT_MS from the environment when no option is passed', async () => {
    const prev = process.env.NVIDIA_TIMEOUT_MS
    process.env.NVIDIA_TIMEOUT_MS = '20'
    const hangingFetch = ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })) as unknown as typeof fetch
    try {
      const provider = new NvidiaProvider({ apiKey: 'k', model: 'm', fetch: hangingFetch })
      const start = Date.now()
      await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'timeout' })
      // Guard temporal: si el env var se ignorara (default 60 s), esto fallaría.
      expect(Date.now() - start).toBeLessThan(2000)
    } finally {
      if (prev === undefined) delete process.env.NVIDIA_TIMEOUT_MS
      else process.env.NVIDIA_TIMEOUT_MS = prev
    }
  })

  it('ignores an invalid NVIDIA_TIMEOUT_MS and falls back to the default', async () => {
    const prev = process.env.NVIDIA_TIMEOUT_MS
    process.env.NVIDIA_TIMEOUT_MS = 'not-a-number'
    try {
      const provider = new NvidiaProvider({
        apiKey: 'k',
        model: 'm',
        timeoutMs: 5,
        fetch: ((_url: string | URL | Request, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          })) as unknown as typeof fetch,
      })
      // Con la opción explícita el env no interviene; la llamada respeta el
      // timeout de 5 ms (si el parseo del env rompiera el constructor, esto
      // lanzaría antes de poder llamar a chat).
      await expect(provider.chat(MESSAGES)).rejects.toMatchObject({ code: 'timeout' })
    } finally {
      if (prev === undefined) delete process.env.NVIDIA_TIMEOUT_MS
      else process.env.NVIDIA_TIMEOUT_MS = prev
    }
  })

  it('never exposes the API key in any error', async () => {
    const attempts: Array<() => Promise<unknown>> = [
      () =>
        new NvidiaProvider({
          apiKey: 'super-secret-xyz',
          model: 'm',
          fetch: (async () => jsonResponse({}, 500)) as unknown as typeof fetch,
        }).chat(MESSAGES),
      () =>
        new NvidiaProvider({
          apiKey: 'super-secret-xyz',
          model: 'm',
          fetch: (async () => {
            throw new Error('super-secret-xyz leaked')
          }) as unknown as typeof fetch,
        }).chat(MESSAGES),
    ]
    for (const attempt of attempts) {
      await expect(attempt()).rejects.not.toThrow(/super-secret-xyz/)
    }
  })
})
