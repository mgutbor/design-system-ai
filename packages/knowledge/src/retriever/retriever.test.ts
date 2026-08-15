import { describe, expect, it } from 'vitest'
import { corpus, retriever } from '../index'
import { EVAL_DATASET } from '../eval/dataset'
import { evaluateRetriever } from '../eval/evaluate'

function searchTop1(query: string): string {
  const results = retriever.search({ text: query })
  return results[0]?.component ?? ''
}

describe('retriever — deterministic cases', () => {
  const cases: [string, string][] = [
    ['botón principal', 'button'],
    ['botón destructivo', 'button'],
    ['campo de texto', 'input'],
    ['campo inválido', 'input'],
    ['seleccionar una opción', 'select'],
    ['dropdown', 'select'],
    ['casilla de selección', 'checkbox'],
    ['ventana modal', 'modal'],
    ['diálogo', 'modal'],
    ['indicador de carga', 'spinner'],
    ['etiqueta de estado', 'badge'],
    ['campo de formulario', 'form-field'],
  ]

  for (const [query, expected] of cases) {
    it(`"${query}" → ${expected}`, () => {
      expect(searchTop1(query)).toBe(expected)
    })
  }
})

describe('retriever — multiple results', () => {
  it('"control de formulario" returns several form controls ranked by score', () => {
    const results = retriever.search({ text: 'control de formulario', topK: 5 })
    const components = results.map((result) => result.component)
    expect(components.length).toBeGreaterThanOrEqual(3)
    // All results must be form controls (button submit is a legitimate form
    // participant via its "form" tag); never modal/spinner/badge.
    const formControls = ['input', 'select', 'checkbox', 'form-field', 'button']
    for (const component of components) {
      expect(formControls).toContain(component)
    }
    expect(components).toContain('input')
    expect(components).toContain('form-field')
    // Ordered by descending score.
    const scores = results.map((result) => result.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })
})

describe('retriever — zero results', () => {
  it('returns [] when there is no evidence', () => {
    expect(retriever.search({ text: 'calendario lunar' })).toEqual([])
    expect(retriever.search({ text: 'receta de cocina' })).toEqual([])
    expect(retriever.search({ text: '' })).toEqual([])
  })

  it('never invents components', () => {
    const allKnown = new Set(corpus.map((entry) => entry.component))
    const results = retriever.search({ text: 'algo completamente ajeno al design system' })
    for (const result of results) {
      expect(allKnown.has(result.component)).toBe(true)
    }
  })
})

describe('retriever — explainable results', () => {
  it('returns matchedTerms and reasons for a hit', () => {
    const [result] = retriever.search({ text: 'botón destructivo' })
    expect(result).toBeDefined()
    expect(result!.component).toBe('button')
    expect(result!.matchedTerms.length).toBeGreaterThan(0)
    expect(result!.reasons.length).toBeGreaterThan(0)
    expect(result!.score).toBeGreaterThan(0)
    // Reasons are human-readable.
    expect(result!.reasons.join(' ')).toMatch(/name|variant|tag|prop/i)
  })

  it('topK is respected and default is 3', () => {
    const defaultResults = retriever.search({ text: 'campo' })
    expect(defaultResults.length).toBeLessThanOrEqual(3)
    const limited = retriever.search({ text: 'campo', topK: 1 })
    expect(limited.length).toBeLessThanOrEqual(1)
  })

  it('results are deterministic across calls', () => {
    const first = retriever.search({ text: 'control de formulario' })
    const second = retriever.search({ text: 'control de formulario' })
    expect(first).toEqual(second)
  })
})

describe('retriever — evaluation dataset (F5.1)', () => {
  it('reports full metrics on the expanded dataset', () => {
    const metrics = evaluateRetriever(retriever, EVAL_DATASET)
    // Dataset: A direct 8 + B intent 9 + C API 7 + D a11y 4 + E tokens 3 +
    // F ambiguous 6 + G negative 19 = 56 cases.
    expect(EVAL_DATASET.length).toBe(56)
    expect(metrics.total).toBe(56)
    expect(metrics.precisionTop1).toBe(1)
    expect(metrics.precisionTop3).toBe(1)
    expect(metrics.failedQueries).toEqual([])
    expect(metrics.falseNegatives).toEqual([])
    expect(metrics.falsePositives).toEqual([])
    expect(metrics.negativesRejected).toBe(20)
  })
})
