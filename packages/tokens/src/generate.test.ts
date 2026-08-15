import { describe, expect, it } from 'vitest'
import { generateAll } from './generate.js'

describe('generateAll', () => {
  const files = generateAll()

  it('generates CSS with :root defaults and dark theme overrides', () => {
    expect(files.css).toContain(':root {')
    expect(files.css).toContain('[data-theme="dark"] {')
    expect(files.css).toContain('--color-blue-600: #2563eb;')
    expect(files.css).toContain('--color-action-primary: var(--color-blue-600);')
  })

  it('generates a TypeScript module with resolved values and getToken', () => {
    expect(files.mjs).toContain('export const tokens')
    expect(files.mjs).toContain('"primary": "#2563eb"')
    expect(files.mjs).toContain('export function getToken(path)')
  })

  it('generates type declarations with literal values and TokenPath', () => {
    expect(files.dts).toContain('export declare const tokens:')
    expect(files.dts).toContain('export declare type TokenPath')
    expect(files.dts).toContain('"color.action.primary"')
    expect(files.dts).toContain('getToken<T extends TokenPath>')
  })

  it('getToken is total for valid TokenPaths and fails fast on unknown ones', async () => {
    const { mjs } = generateAll()
    const mod = (await import(
      `data:text/javascript;base64,${Buffer.from(mjs).toString('base64')}`
    )) as { getToken: (path: string) => string; tokens: Record<string, unknown> }

    // Valid paths resolve to the light-resolved literal values.
    expect(mod.getToken('color.action.primary')).toBe('#2563eb')
    expect(mod.getToken('space.4')).toBe('1rem')
    expect(mod.tokens.color).toBeDefined()

    // Unknown paths fail fast — never a silent undefined.
    expect(() => mod.getToken('color.does.not.exist')).toThrow(/Unknown token path/)
    expect(() => mod.getToken('color.action')).toThrow(/Unknown token path/)
  })
})
