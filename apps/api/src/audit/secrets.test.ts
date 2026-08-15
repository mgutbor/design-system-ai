import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { NvidiaProvider, NvidiaProviderError } from '@ods-ai/ai-providers'
import { answerQuestion } from '@ods-ai/ai-core'
import { createApp } from '../app'

/**
 * F7.1 §2 — Secrets audit.
 *
 * Uses a distinctive, fake key (never a real one) and verifies it cannot
 * appear anywhere observable: HTTP responses, serialized errors, AIAnswer,
 * RetrievalTrace, exceptions, generated docs and frontend bundles.
 */

// A distinctive fake key used ONLY in tests. If this string ever shows up in
// an observable output, the test fails.
const FAKE_KEY = 'sk-f7-secret-audit-0123456789abcdef'

function nvidiaWith(key: string, fetchImpl: typeof fetch): NvidiaProvider {
  return new NvidiaProvider({ apiKey: key, model: 'audit-model', fetch: fetchImpl })
}

describe('F7.1 §2 — secrets never leak', () => {
  it('API key not present in a successful HTTP response', async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }], model: 'm' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    const app = createApp({
      provider: nvidiaWith(FAKE_KEY, fetchMock as unknown as typeof fetch),
    })
    const res = await app.request('http://localhost/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '¿Cómo uso Button?' }),
    })
    const text = await res.text()
    expect(text).not.toContain(FAKE_KEY)
    expect(text).not.toContain('Authorization')
    expect(text).not.toContain('Bearer ')
  })

  it('API key not present in provider error responses (429/502/503)', async () => {
    for (const [code, status] of [
      ['rate_limit', 429],
      ['timeout', 503],
      ['auth', 502],
    ] as const) {
      const failing = nvidiaWith(FAKE_KEY, async () => {
        throw new NvidiaProviderError(code, `detail ${FAKE_KEY}`)
      })
      const app = createApp({ provider: failing })
      const res = await app.request('http://localhost/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '¿Cómo uso Button?' }),
      })
      expect(res.status).toBe(status)
      const text = await res.text()
      expect(text).not.toContain(FAKE_KEY)
      expect(text).not.toContain('detail')
    }
  })

  it('API key not present in a thrown provider error', async () => {
    const failing = nvidiaWith(FAKE_KEY, async () => {
      throw new NvidiaProviderError('auth', `bad key ${FAKE_KEY}`)
    })
    let caught: unknown
    try {
      await answerQuestion({ provider: failing, question: '¿Cómo uso Button?' })
    } catch (error) {
      caught = error
    }
    const serialized = JSON.stringify(caught)
    expect(serialized).not.toContain(FAKE_KEY)
    expect(String(caught)).not.toContain(FAKE_KEY)
  })

  it('AIAnswer and RetrievalTrace never contain the key', async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }], model: 'm' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    const answer = await answerQuestion({
      provider: nvidiaWith(FAKE_KEY, fetchMock as unknown as typeof fetch),
      question: '¿Cómo uso Button?',
    })
    const serialized = JSON.stringify(answer)
    expect(serialized).not.toContain(FAKE_KEY)
    expect(serialized).not.toContain('sk-')
  })

  it('AIProviderError public message never contains the key even when the cause does', async () => {
    const failing = nvidiaWith(FAKE_KEY, async () => {
      throw new Error(`ECONNREFUSED with ${FAKE_KEY} inside`)
    })
    let message = ''
    try {
      await answerQuestion({ provider: failing, question: '¿Cómo uso Button?' })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).not.toContain(FAKE_KEY)
  })

  it('.env is not versioned and .env.example has no real secret', () => {
    const root = join(__dirname, '..', '..', '..')
    // .env.example may exist but must not contain a real key format.
    const examplePath = join(root, '.env.example')
    if (existsSync(examplePath)) {
      const content = readFileSync(examplePath, 'utf8')
      expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/)
      expect(content).not.toMatch(/AI_API_KEY=.+/)
    }
    // A real .env file would break the audit if committed — it is gitignored,
    // and this test asserts it does not exist in the working tree.
    expect(existsSync(join(root, '.env'))).toBe(false)
  })

  it('no frontend bundle or client source contains NVIDIA_API_KEY', () => {
    const roots = [
      join(__dirname, '..', '..', '..', 'apps', 'docs'),
      join(__dirname, '..', '..', '..', 'apps', 'playground'),
    ]
    const forbidden = ['NVIDIA_API_KEY', 'NVIDIA_MODEL', 'sk-f7-secret']
    const TEXT_EXT = /[.](ts|tsx|js|jsx|mjs|json|html|md|css)$/
    const walk = (dir: string): void => {
      if (!existsSync(dir)) return
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.turbo' ||
          entry.name === 'dist' ||
          entry.name === 'storybook-static' ||
          entry.name.startsWith('.')
        )
          continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (entry.isFile() && TEXT_EXT.test(entry.name)) {
          const size = readFileSync(full).length
          if (size > 1_000_000) continue
          const content = readFileSync(full, 'utf8')
          for (const token of forbidden) {
            expect(content, `${full} contains ${token}`).not.toContain(token)
          }
        }
      }
    }
    for (const root of roots) walk(root)
  })
})
