import { describe, expect, it } from 'vitest'
import { buildAllMetadata } from './metadata'

describe('buildAllMetadata', () => {
  // El generador parsea 8 componentes con react-docgen; bajo turbo (suite
  // duplicada en cada task) necesita más que el timeout por defecto de 5s.
  it('generates matured metadata for every detected component', async () => {
    const all = await buildAllMetadata()
    expect(all.length).toBeGreaterThan(0)
    for (const entry of all) {
      // Identidad estable + tipo + nombre + descripción (retrieval).
      expect(entry.id).toBe(`ods-ai/${entry.component}`)
      expect(entry.kind).toBe('component')
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
      expect(entry.url).toBe(`/components/${entry.component}`)
      expect(entry.sourcePath).toBe(`packages/react/src/${entry.component}/${entry.name}.tsx`)
      expect(entry.tags.length).toBeGreaterThan(0)
      expect(entry.a11ySummary.length).toBeGreaterThan(0)
      expect(entry.tokensUsed.length).toBeGreaterThan(0)
      expect(entry.examples.length).toBeGreaterThan(0)
      // V1-0 (P1-1): guía de decisión presente en todos los componentes.
      expect(entry.whenToUse?.length ?? 0).toBeGreaterThan(0)
      expect(entry.whenNotToUse?.length ?? 0).toBeGreaterThan(0)
      for (const example of entry.examples) {
        expect(example.code.length).toBeGreaterThan(0)
      }
    }
  }, 15_000)

  it('describes the Button API with its tokens and examples', async () => {
    const all = await buildAllMetadata()
    const button = all.find((entry) => entry.component === 'button')
    expect(button).toBeDefined()
    expect(button!.id).toBe('ods-ai/button')
    expect(button!.name).toBe('Button')
    expect(button!.kind).toBe('component')
    expect(button!.props.map((prop) => prop.name)).toEqual(
      expect.arrayContaining(['variant', 'size', 'loading']),
    )
    expect(button!.variants).toEqual(['primary', 'secondary', 'ghost', 'destructive'])
    expect(button!.sizes).toEqual(['sm', 'md', 'lg'])
    expect(button!.tokensUsed).toEqual(
      expect.arrayContaining(['color.action.primary', 'color.focus.ring', 'radius.md']),
    )
    expect(button!.tags).toContain('button')
    expect(button!.a11ySummary.length).toBeGreaterThan(0)
    expect(button!.whenToUse?.some((item) => item.includes('acciones alternativas'))).toBe(true)
    expect(button!.whenNotToUse?.some((item) => item.includes('navegar'))).toBe(true)
  }, 15_000)
})
