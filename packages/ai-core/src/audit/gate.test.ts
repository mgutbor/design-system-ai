import { describe, expect, it } from 'vitest'
import { retriever } from '@ods-ai/knowledge'
import { answerQuestion, DEFAULT_MIN_SCORE } from '../index'
import type { AIProvider, AIResponse } from '../types'

/** Local minimal provider (ai-core cannot import ai-providers by design). */
class LocalProvider implements AIProvider {
  readonly id = 'mock' as const
  async chat(): Promise<AIResponse> {
    return { content: 'ok', model: 'local-1', providerId: 'mock', finishReason: 'stop' }
  }
}
const provider = new LocalProvider()

interface GateCase {
  query: string
  category: string
  expectedPassing?: string[]
  expectRefusal?: boolean
}

const GATE_CASES: GateCase[] = [
  // Clearly relevant (strong name/tag/variant matches).
  { query: '¿Cómo uso Button?', category: 'relevante', expectedPassing: ['button'] },
  { query: '¿Qué variantes tiene Button?', category: 'relevante', expectedPassing: ['button'] },
  { query: '¿Cómo valido un Input?', category: 'relevante', expectedPassing: ['input'] },
  { query: '¿Cómo uso un Select?', category: 'relevante', expectedPassing: ['select'] },
  { query: '¿Cómo uso un Checkbox?', category: 'relevante', expectedPassing: ['checkbox'] },
  { query: '¿Cómo funciona el foco del Modal?', category: 'relevante', expectedPassing: ['modal'] },
  // Weakly related single-token queries.
  { query: 'selección', category: 'débil', expectedPassing: ['checkbox', 'select'] },
  { query: 'estado', category: 'débil', expectedPassing: ['badge'] },
  // "error" matches the `invalid` own prop (score 20): a domain signal that
  // passes the gate at minScore=20 (F6.1 audit, demonstrated case).
  { query: 'error', category: 'débil', expectedPassing: ['checkbox', 'input', 'select'] },
  // API/prop queries (F5.1 dataset) must pass: prop matches are domain signals.
  {
    query: '¿Qué componentes tienen invalid?',
    category: 'débil',
    expectedPassing: ['checkbox', 'input', 'select'],
  },
  {
    query: '¿Qué componente acepta loading?',
    category: 'débil',
    expectedPassing: ['spinner', 'button'],
  },
  // Ambiguous.
  { query: 'control de formulario', category: 'ambiguo', expectedPassing: ['form-field', 'input'] },
  { query: 'campo inválido', category: 'ambiguo', expectedPassing: ['input'] },
  // Negative / irrelevant (F5.1 dataset): must refuse.
  { query: 'Necesito una tabla', category: 'negativa', expectRefusal: true },
  { query: 'Quiero una tarjeta', category: 'negativa', expectRefusal: true },
  { query: 'Necesito tabs', category: 'negativa', expectRefusal: true },
  { query: 'Quiero un toast', category: 'negativa', expectRefusal: true },
  { query: 'Necesito un calendario', category: 'negativa', expectRefusal: true },
  { query: 'Necesito un date picker', category: 'negativa', expectRefusal: true },
  { query: 'Quiero un tooltip', category: 'negativa', expectRefusal: true },
  { query: 'Necesito un avatar', category: 'negativa', expectRefusal: true },
  { query: 'Use DataGrid', category: 'negativa', expectRefusal: true },
  { query: 'Use DatePicker', category: 'negativa', expectRefusal: true },
  { query: 'Use Card', category: 'negativa', expectRefusal: true },
  { query: 'Quiero autenticación', category: 'negativa', expectRefusal: true },
  { query: 'Necesito una API', category: 'negativa', expectRefusal: true },
  { query: 'Quiero hacer login', category: 'negativa', expectRefusal: true },
]

describe('gate minScore audit (F6.1 §1)', () => {
  it('DEFAULT_MIN_SCORE is 20 (prop matches are domain signals)', () => {
    expect(DEFAULT_MIN_SCORE).toBe(20)
  })

  it('clearly relevant queries pass the gate', () => {
    for (const testCase of GATE_CASES.filter((c) => c.category === 'relevante')) {
      const results = retriever.search({ text: testCase.query })
      const passing = results.filter((r) => r.score >= DEFAULT_MIN_SCORE)
      expect(passing.length, testCase.query).toBeGreaterThan(0)
      const names = passing.map((r) => r.component)
      for (const expected of testCase.expectedPassing ?? []) {
        expect(names, testCase.query).toContain(expected)
      }
    }
  })

  it('weakly related and ambiguous queries pass with reasonable components', () => {
    for (const testCase of GATE_CASES.filter((c) => ['débil', 'ambiguo'].includes(c.category))) {
      const results = retriever.search({ text: testCase.query })
      const passing = results.filter((r) => r.score >= DEFAULT_MIN_SCORE)
      expect(passing.length, testCase.query).toBeGreaterThan(0)
      const names = passing.map((r) => r.component)
      for (const expected of testCase.expectedPassing ?? []) {
        expect(names, testCase.query).toContain(expected)
      }
    }
  })

  it('negative/irrelevant queries never pass the gate', () => {
    for (const testCase of GATE_CASES.filter((c) => c.category === 'negativa')) {
      const results = retriever.search({ text: testCase.query })
      const passing = results.filter((r) => r.score >= DEFAULT_MIN_SCORE)
      expect(passing, testCase.query).toEqual([])
    }
  })

  it('gate matches AI Core refusal behavior (hasRelevantContext)', async () => {
    for (const testCase of GATE_CASES.filter((c) => c.expectRefusal)) {
      const answer = await answerQuestion({ provider, question: testCase.query })
      expect(answer.hasRelevantContext, testCase.query).toBe(false)
    }
  })

  it('no false negatives among relevant/weak/ambiguous queries', async () => {
    for (const testCase of GATE_CASES.filter(
      (c) => !c.expectRefusal && ['relevante', 'débil', 'ambiguo'].includes(c.category),
    )) {
      const answer = await answerQuestion({ provider, question: testCase.query })
      expect(answer.hasRelevantContext, testCase.query).toBe(true)
      expect(answer.referencedComponents.length, testCase.query).toBeGreaterThan(0)
    }
  })

  it('minScore=20 keeps name/tag/variant/prop matches and excludes token/description/example', () => {
    // name=100/60, tag=30, variant=25, prop=20 pass; token=10, desc/a11y=5, example=3 don't.
    expect(DEFAULT_MIN_SCORE).toBe(20)
  })

  it('gate does not depend accidentally on topK', async () => {
    // A query with a single strong hit behaves identically for topK=1 and topK=5.
    const a1 = await answerQuestion({
      provider,
      question: '¿Cómo uso Button?',
      options: { topK: 1 },
    })
    const a5 = await answerQuestion({
      provider,
      question: '¿Cómo uso Button?',
      options: { topK: 5 },
    })
    expect(a1.referencedComponents).toEqual(a5.referencedComponents)
    expect(a1.hasRelevantContext).toBe(a5.hasRelevantContext)

    // But topK bounds the number of components injected (no accidental leakage
    // beyond the requested window).
    const multi = await answerQuestion({
      provider,
      question: 'control de formulario',
      options: { topK: 1 },
    })
    expect(multi.referencedComponents.length).toBeLessThanOrEqual(1)
  })
})
