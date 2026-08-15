import { join } from 'node:path'
import { flatten, isRef, loadAll } from './loader.js'
import { buildResolver, toCssName } from './resolve.js'
import { collectCssVarNames } from './usage.js'

export interface ValidateOptions {
  /**
   * Scan source files for CSS var(--...) references and treat them as usage.
   * Enabled by the CLI/CI; disabled by default for unit tests.
   */
  scanCode?: boolean
  /** Repo root to scan. Defaults to the monorepo root (../../ from src/). */
  repoRoot?: string
}

export interface ValidationReport {
  ok: boolean
  errors: string[]
  warnings: string[]
  summary: {
    primitive: number
    semantic: number
    component: number
    themes: string[]
    contrastPairs: number
  }
}

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function parseHex(hex: string): [number, number, number] {
  const match = HEX_PATTERN.exec(hex)
  if (!match) return [0, 0, 0]
  const n = parseInt(match[0].slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function srgbToLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function contrastRatio(a: string, b: string): number {
  const [hi = 1, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function validateTokens(options: ValidateOptions = {}): ValidationReport {
  const layers = loadAll()
  const resolver = buildResolver(layers)
  const errors: string[] = []
  const warnings: string[] = []

  const flatPrimitive = flatten(layers.primitive, 'primitive')
  const flatSemantic = flatten(layers.semantic, 'semantic')
  const flatComponent = flatten(layers.component, 'component')
  const allFlat = [...flatPrimitive, ...flatSemantic, ...flatComponent]

  // 1. Naming: every path segment must be kebab-case / numeric.
  for (const { path } of allFlat) {
    for (const segment of path.split('.')) {
      if (!NAME_PATTERN.test(segment)) {
        errors.push(`invalid token name segment "${segment}" in "${path}" (kebab-case required)`)
      }
    }
  }

  // 2. No duplicates / shadowing across layers.
  const byPath = new Map<string, string>()
  for (const { path, layer } of allFlat) {
    const previous = byPath.get(path)
    if (previous && previous !== layer) {
      errors.push(`token "${path}" defined in both "${previous}" and "${layer}" layers (shadowing)`)
    } else {
      byPath.set(path, layer)
    }
  }

  // 3. References resolve and have no cycles.
  for (const { path } of allFlat) {
    const resolved = resolver.resolve(path)
    if (!resolved.ok) errors.push(resolved.error)
  }

  // 4. Theme overrides must target semantic tokens and resolve.
  for (const [themeName, theme] of Object.entries(layers.themes)) {
    for (const { path } of flatten(theme, 'semantic')) {
      const targetLayer = byPath.get(path)
      if (targetLayer === undefined) {
        errors.push(`theme "${themeName}" overrides unknown token "${path}"`)
      } else if (targetLayer !== 'semantic') {
        errors.push(
          `theme "${themeName}" overrides "${path}" which is a "${targetLayer}" token — themes must only override semantic tokens`,
        )
      }
      const resolved = resolver.resolve(path, theme)
      if (!resolved.ok) errors.push(`theme "${themeName}": ${resolved.error}`)
    }
  }

  // 5. Dead / alias-only audit (warnings).
  const referenced = new Set<string>()
  for (const { value } of allFlat) {
    if (typeof value === 'string' && isRef(value)) referenced.add(value)
  }
  for (const theme of Object.values(layers.themes)) {
    for (const { path, value } of flatten(theme, 'semantic')) {
      referenced.add(path)
      if (typeof value === 'string' && isRef(value)) referenced.add(value)
    }
  }
  for (const pair of layers.contrast) {
    referenced.add(pair.fg)
    referenced.add(pair.bg)
  }

  // 5b. Code usage scan: CSS var(--...) references in the repository are the
  // source of truth for which tokens components actually use. This avoids false
  // "unreferenced" warnings once F1 components start consuming tokens, without
  // a hand-maintained list (ADR-003, "Auditoría de uso").
  if (options.scanCode) {
    const repoRoot = options.repoRoot ?? join(import.meta.dirname, '..', '..', '..')
    const knownCssNames = new Map<string, string>()
    for (const { path } of allFlat) knownCssNames.set(toCssName(path), path)
    for (const cssName of collectCssVarNames(repoRoot)) {
      const path = knownCssNames.get(cssName)
      if (path) {
        referenced.add(path)
      } else {
        warnings.push(`CSS variable "${cssName}" used in code does not match any token`)
      }
    }
  }
  for (const { path } of flatSemantic) {
    if (!referenced.has(path)) {
      warnings.push(`unreferenced semantic token "${path}" — remove it or justify it in an ADR`)
    }
  }
  for (const { path, value } of flatComponent) {
    if (typeof value === 'string' && isRef(value) && byPath.get(value) === 'semantic') {
      // A component token that is a bare alias of a semantic token adds no
      // semantics and should be removed (SPEC §5, strict rule).
      warnings.push(`alias-only component token "${path}" → "${value}" (adds no semantics)`)
    }
  }

  // 6. WCAG contrast, per theme.
  for (const pair of layers.contrast) {
    for (const [themeName, theme] of Object.entries(layers.themes)) {
      const fg = resolver.resolve(pair.fg, theme)
      const bg = resolver.resolve(pair.bg, theme)
      if (!fg.ok) {
        errors.push(`contrast pair "${pair.id}": ${fg.error}`)
        continue
      }
      if (!bg.ok) {
        errors.push(`contrast pair "${pair.id}": ${bg.error}`)
        continue
      }
      if (!HEX_PATTERN.test(fg.value)) {
        errors.push(`contrast pair "${pair.id}": foreground "${pair.fg}" is not a color token`)
        continue
      }
      if (!HEX_PATTERN.test(bg.value)) {
        errors.push(`contrast pair "${pair.id}": background "${pair.bg}" is not a color token`)
        continue
      }
      const ratio = contrastRatio(fg.value, bg.value)
      if (ratio < pair.target) {
        errors.push(
          `contrast pair "${pair.id}" (${themeName}): ${ratio.toFixed(2)}:1 < ${pair.target}:1 ` +
            `(${fg.value} on ${bg.value})`,
        )
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      primitive: flatPrimitive.length,
      semantic: flatSemantic.length,
      component: flatComponent.length,
      themes: Object.keys(layers.themes),
      contrastPairs: layers.contrast.length,
    },
  }
}
