import { describe, expect, it } from 'vitest'
import { buildContext } from './buildContext'
import { corpus, retriever } from '../index'

describe('buildContext', () => {
  it('returns a clear message for empty results', () => {
    const results = retriever.search({ text: 'calendario lunar' })
    expect(results).toEqual([])
    expect(buildContext(results, corpus)).toMatch(/no relevant documentation/i)
  })

  it('contains useful, compact information for a real hit', () => {
    const results = retriever.search({ text: 'botón principal' })
    const context = buildContext(results, corpus)
    expect(context).toContain('# Button')
    expect(context).toContain('/components/button')
    expect(context).toContain('## API')
    expect(context).toContain('variant')
    expect(context).toContain('## Canonical examples')
    expect(context).toContain('## Accessibility')
  })

  it('does not leak inherited HTML props into the context', () => {
    const results = retriever.search({ text: 'campo de texto' })
    const context = buildContext(results, corpus)
    // The corpus filters inherited props; the context must never re-introduce them.
    expect(context).not.toContain('aria-label')
    expect(context).not.toContain('onClickCapture')
    expect(context).not.toContain('className')
  })

  it('builds context for every component in the corpus', () => {
    for (const entry of corpus) {
      const results = retriever.search({ text: entry.component })
      expect(results.length).toBeGreaterThan(0)
      const context = buildContext(results, corpus)
      expect(context).toContain(`# ${entry.name}`)
    }
  })
})

describe('buildContext determinism (F5.1)', () => {
  it('same input always produces the same output', () => {
    const results = retriever.search({ text: 'botón principal' })
    expect(buildContext(results, corpus)).toBe(buildContext(results, corpus))
  })

  it('reordering the input does not change the logical content', () => {
    const results = retriever.search({ text: 'control de formulario' })
    const forward = buildContext(results, corpus)
    const reversed = buildContext([...results].reverse(), corpus)
    expect(forward).toBe(reversed)
  })

  it('includes only the components actually recovered', () => {
    const results = retriever.search({ text: 'campo de texto' })
    const context = buildContext(results, corpus)
    // Every section header must correspond to a recovered component.
    const headers = [...context.matchAll(/^# (.+) \((.+)\)$/gm)].map((m) => m[2])
    for (const header of headers) {
      expect(results.some((result) => result.component === header)).toBe(true)
    }
  })
})
