import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

/** Lista los archivos .ts/.tsx de src/ excluyendo los propios tests. */
function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return listSourceFiles(full)
    if (!/\.(ts|tsx)$/.test(name)) return []
    if (name.endsWith('.test.ts') || name.endsWith('.test.tsx')) return []
    return [full]
  })
}

const IMPORT_SPECIFIER = /from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g

describe('arquitectura: apps/docs no depende de knowledge en runtime', () => {
  it('ningún archivo de src/ importa @ods-ai/knowledge ni rutas de packages/knowledge', () => {
    const offenders: string[] = []
    for (const file of listSourceFiles(here)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(IMPORT_SPECIFIER)) {
        const specifier = match[1] ?? match[2]
        if (specifier === undefined) continue
        if (
          specifier === '@ods-ai/knowledge' ||
          specifier.startsWith('@ods-ai/knowledge/') ||
          specifier.includes('packages/knowledge')
        ) {
          offenders.push(`${file.replace(`${here}/`, '')} → ${specifier}`)
        }
      }
    }
    expect(
      offenders,
      'apps/docs/src no debe importar knowledge en runtime. Las únicas referencias a knowledge son tooling/tests (scripts/ y *.test.*).',
    ).toEqual([])
  })
})
