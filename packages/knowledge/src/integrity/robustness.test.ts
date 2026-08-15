import { describe, expect, it } from 'vitest'
import { corpus, retriever } from '../index'

/**
 * Robustness (F5.1): retrieval must NEVER return a component that does not
 * exist in the corpus. The corpus — built from the real metadata JSON — is
 * the only source of truth. Queries for non-existent components must return
 * [] when there is no evidence.
 */

const ALL_KNOWN_COMPONENTS = new Set(corpus.map((entry) => entry.component))

const NON_EXISTENT_QUERIES = [
  'Use DataGrid',
  'Use DatePicker',
  'Use Toast',
  'Use Card',
  'Use Tabs',
  'Use Avatar',
  'Necesito una tabla',
  'Quiero un tooltip',
  'Necesito un drawer',
  'Necesito un date picker',
]

describe('robustness against non-existent components (F5.1)', () => {
  it('every result always belongs to the real corpus', () => {
    // Exhaustive property test over a wide variety of queries.
    const queries = [
      ...NON_EXISTENT_QUERIES,
      'botón',
      'campo de texto',
      'color.action.danger',
      'invalid',
      'modal',
      'cualquier cosa aleatoria',
    ]
    for (const query of queries) {
      for (const result of retriever.search({ text: query })) {
        expect(ALL_KNOWN_COMPONENTS.has(result.component)).toBe(true)
      }
    }
  })

  it('non-existent component names return [] (no invented components)', () => {
    for (const query of NON_EXISTENT_QUERIES) {
      const results = retriever.search({ text: query })
      expect(results, `query "${query}" should return []`).toEqual([])
    }
  })

  it('the corpus is the source of truth: components come from metadata only', () => {
    // Every corpus component maps to a real metadata id and source path.
    for (const entry of corpus) {
      expect(entry.id).toMatch(/^ods-ai\//)
      expect(entry.sourcePath).toMatch(/^packages\/react\/src\//)
    }
  })
})
