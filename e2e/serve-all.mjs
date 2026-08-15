import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { startServer } from './serve-static.mjs'

const here = import.meta.dirname

/**
 * Arranca la API real (apps/api) con MockProvider — offline y determinista,
 * sin API key ni internet. El E2E del asistente ejercita el flujo completo:
 * docs → POST /api/ask → ai-core → retrieval → gate → context → provider.
 */
const API_PORT = 3001
const api = spawn(process.execPath, ['--import', 'tsx', 'src/entrypoints/node.ts'], {
  cwd: resolve(here, '../apps/api'),
  env: { ...process.env, AI_PROVIDER: 'mock', PORT: String(API_PORT) },
  stdio: 'inherit',
})

// Espera a que la API responda antes de servir los estáticos: si no arranca,
// Playwright debe fallar con el error del webServer, no con tests flaky.
async function waitForHealth(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await globalThis.fetch(url)
      if (res.ok) return
    } catch {
      // aún no está lista
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`apps/api no respondió en ${url} (${timeoutMs}ms)`)
}

await waitForHealth(`http://127.0.0.1:${API_PORT}/api/health`)

// 6006 Storybook · 6007 docs · 6008 playground
startServer(6006, resolve(here, '../storybook-static'))
startServer(6007, resolve(here, '../apps/docs/dist'))
startServer(6008, resolve(here, '../apps/playground/dist'))

// La API y los servidores mantienen vivo el proceso; Playwright lo termina.
api.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[serve-all] apps/api terminó con código ${code}`)
  }
})
