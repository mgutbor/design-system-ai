import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

/**
 * The source of truth for which tokens are actually used is the real code:
 * CSS custom property references (var with a double-dash token name) in the
 * repository. This lets the validator distinguish tokens used by components
 * from tokens that are genuinely unused — without a hand-maintained list or
 * duplicated metadata (ADR-003, "Auditoría de uso").
 */

const VAR_PATTERN = /var\(\s*(--[a-z0-9-]+)/g
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css'])
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'storybook-static',
  '.turbo',
  '.git',
  'coverage',
  'test-results',
  'playwright-report',
])

/**
 * Collects the names (with the `--` prefix) of every CSS custom property
 * referenced via var() in the directory tree rooted at `root`. Test files are
 * excluded: their fixtures are not real usage.
 */
export function collectCssVarNames(root: string): string[] {
  const names = new Set<string>()
  walk(root, (file) => {
    if (!SCAN_EXTENSIONS.has(extname(file))) return
    if (TEST_FILE_PATTERN.test(file)) return
    const content = readFileSync(file, 'utf8')
    for (const match of content.matchAll(VAR_PATTERN)) {
      const name = match[1]
      if (name) names.add(name)
    }
  })
  return [...names]
}

function walk(dir: string, onFile: (file: string) => void): void {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(abs, onFile)
    } else {
      onFile(abs)
    }
  }
}
