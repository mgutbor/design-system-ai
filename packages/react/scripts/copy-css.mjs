// Copia los CSS modules de `src` a `dist` conservando la estructura relativa:
// el JS compilado importa `./X.module.css` desde `dist/`, por lo que los CSS
// deben vivir en la misma ruta relativa dentro del paquete publicado.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('../src/', import.meta.url))
const distDir = fileURLToPath(new URL('../dist/', import.meta.url))

let copied = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full)
    } else if (entry.endsWith('.module.css')) {
      const out = join(distDir, full.slice(srcDir.length))
      mkdirSync(dirname(out), { recursive: true })
      cpSync(full, out)
      copied += 1
    }
  }
}

if (!existsSync(srcDir)) {
  console.error('[copy-css] src/ no existe')
  process.exit(1)
}

walk(srcDir)
console.log(`[copy-css] ${copied} CSS modules copiados a dist/`)
