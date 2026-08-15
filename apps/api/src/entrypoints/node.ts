import { serve } from '@hono/node-server'
import { NvidiaProvider, MockProvider } from '@ods-ai/ai-providers'
import { createApp } from '../app'

/**
 * Local Node entrypoint (ADR-005: entrypoints/node.ts).
 *
 * Provider selection by environment:
 * - AI_PROVIDER=nvidia (or NVIDIA_API_KEY set) → NvidiaProvider
 * - anything else / unset → MockProvider (offline, deterministic, no API key)
 *
 * The API key is read ONLY server-side from the environment; it is never in
 * the browser, the repository, logs or HTTP responses.
 */
function selectProvider() {
  const explicit = process.env.AI_PROVIDER
  const hasKey = Boolean(process.env.NVIDIA_API_KEY)
  if (explicit === 'nvidia' || hasKey) {
    // Throws NvidiaProviderError at construction if misconfigured — fail fast.
    return new NvidiaProvider()
  }
  return new MockProvider()
}

const provider = selectProvider()
const app = createApp({ provider })

const port = Number(process.env.PORT ?? 3001)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port} (provider: ${provider.id})`)
})
