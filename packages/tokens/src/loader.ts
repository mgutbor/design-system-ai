import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type TokenTree = { [key: string]: TokenTree | string }

export interface ContrastPair {
  id: string
  fg: string
  bg: string
  target: number
}

export interface TokenLayers {
  primitive: TokenTree
  semantic: TokenTree
  component: TokenTree
  themes: Record<string, TokenTree>
  contrast: ContrastPair[]
}

export const DEFAULT_TOKENS_DIR = join(import.meta.dirname, 'tokens')

const REF_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/

/** A value is a reference when it looks like a dotted kebab-case token path. */
export function isRef(value: string): boolean {
  return REF_PATTERN.test(value)
}

function deepMerge(target: TokenTree, source: TokenTree): void {
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('_')) continue
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof target[key] === 'object' &&
      target[key] !== null
    ) {
      deepMerge(target[key] as TokenTree, value)
    } else {
      target[key] = value
    }
  }
}

function loadJsonTree(dir: string): TokenTree {
  const result: TokenTree = {}
  if (!existsSync(dir)) return result
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8')) as TokenTree
    deepMerge(result, parsed)
  }
  return result
}

function loadThemeFile(tokensDir: string, name: string): TokenTree {
  const file = join(tokensDir, 'theme', `${name}.json`)
  if (!existsSync(file)) return {}
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as TokenTree
  const result: TokenTree = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith('_')) continue
    result[key] = value
  }
  return result
}

export function loadAll(tokensDir: string = DEFAULT_TOKENS_DIR): TokenLayers {
  const themes: Record<string, TokenTree> = {}
  for (const name of ['light', 'dark']) {
    themes[name] = loadThemeFile(tokensDir, name)
  }
  const contrast = JSON.parse(readFileSync(join(tokensDir, 'contrast.json'), 'utf8')) as {
    pairs: ContrastPair[]
  }
  return {
    primitive: loadJsonTree(join(tokensDir, 'primitive')),
    semantic: loadJsonTree(join(tokensDir, 'semantic')),
    component: loadJsonTree(join(tokensDir, 'component')),
    themes,
    contrast: contrast.pairs,
  }
}

export interface FlatToken {
  path: string
  value: TokenTree | string
  layer: 'primitive' | 'semantic' | 'component'
}

export function flatten(tree: TokenTree, layer: FlatToken['layer'], prefix = ''): FlatToken[] {
  const out: FlatToken[] = []
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      out.push({ path, value, layer })
    } else {
      out.push(...flatten(value, layer, path))
    }
  }
  return out
}

export function lookup(tree: TokenTree, path: string): TokenTree | string | undefined {
  let current: TokenTree | string | undefined = tree
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined
    current = current[segment]
  }
  return current
}
