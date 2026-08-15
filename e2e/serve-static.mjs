import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

/** Serves a static directory with SPA fallback to index.html. */
export function startServer(port, root) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
      const filePath = join(root, pathname === '/' ? 'index.html' : pathname)
      const data = await readFile(filePath)
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      })
      res.end(data)
    } catch {
      // SPA fallback
      try {
        const data = await readFile(join(root, 'index.html'))
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end('not found')
      }
    }
  })
  server.listen(port, '127.0.0.1')
  console.log(`serving ${root} on http://127.0.0.1:${port}`)
  return server
}

// CLI mode: node serve-static.mjs <puerto> [directorio]
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const root = resolve(import.meta.dirname, '../', process.argv[3] ?? 'storybook-static')
  startServer(Number(process.argv[2] ?? 6006), root)
}
