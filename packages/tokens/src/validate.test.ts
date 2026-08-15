import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, validateTokens } from './validate.js'
import { buildResolver } from './resolve.js'
import { loadAll } from './loader.js'
import { collectCssVarNames } from './usage.js'

describe('validateTokens', () => {
  it('passes on the F0 token set', () => {
    const report = validateTokens()
    expect(report.errors).toEqual([])
    expect(report.ok).toBe(true)
    expect(report.summary.primitive).toBeGreaterThan(0)
    expect(report.summary.semantic).toBeGreaterThan(0)
    expect(report.summary.component).toBe(0) // strict rule: no component tokens in F0
    expect(report.summary.themes).toEqual(['light', 'dark'])
    expect(report.summary.contrastPairs).toBeGreaterThan(0)
  })
})

describe('contrastRatio', () => {
  it('computes WCAG ratios correctly', () => {
    // White on near-black ≈ 17:1
    expect(contrastRatio('#ffffff', '#111827')).toBeGreaterThan(15)
    // Identical colors are 1:1
    expect(contrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1, 5)
    // Known pair: #2563eb (blue-600) on #ffffff is ≈ 5.2:1
    expect(contrastRatio('#ffffff', '#2563eb')).toBeGreaterThan(4.5)
  })
})

describe('code usage scan (D1)', () => {
  it('collects CSS var() names from source files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ods-tokens-scan-'))
    try {
      writeFileSync(join(dir, 'a.tsx'), 'style={{ background: "var(--color-action-primary)" }}')
      writeFileSync(
        join(dir, 'a.module.css'),
        '.x { border: 1px solid var(--color-border-default, #000); }',
      )
      writeFileSync(join(dir, 'ignored.json'), 'var(--should-not-count)')
      // Test files are excluded: their fixtures are not real usage.
      writeFileSync(join(dir, 'x.test.ts'), 'style={{ color: "var(--color-action-primary)" }}')
      expect(collectCssVarNames(dir).sort()).toEqual([
        '--color-action-primary',
        '--color-border-default',
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('marks tokens used only in code as referenced and warns on unknown vars', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ods-tokens-scan2-'))
    try {
      writeFileSync(join(dir, 'comp.css'), '.b { background: var(--color-action-primary); }')
      writeFileSync(join(dir, 'typo.css'), '.t { color: var(--color-not-a-token); }')
      const report = validateTokens({ scanCode: true, repoRoot: dir })
      expect(report.ok).toBe(true)
      expect(report.warnings.some((w) => w.includes('--color-not-a-token'))).toBe(true)
      // The token used only in code is not reported as unreferenced.
      expect(report.warnings.some((w) => w.includes('color.action.primary'))).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('resolver', () => {
  it('resolves semantic tokens to primitive values (light defaults)', () => {
    const resolver = buildResolver(loadAll())
    const resolved = resolver.resolve('color.text.default')
    expect(resolved).toEqual({ ok: true, value: '#111827' })
  })

  it('applies dark theme overrides', () => {
    const layers = loadAll()
    const resolver = buildResolver(layers)
    const resolved = resolver.resolve('color.text.default', layers.themes['dark'])
    expect(resolved).toEqual({ ok: true, value: '#f3f4f6' })
  })
})
