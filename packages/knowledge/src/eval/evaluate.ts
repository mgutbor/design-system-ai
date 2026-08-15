import type { Retriever } from '../types'
import type { EvalCase } from './dataset'

/** Metrics of a retrieval evaluation run (F5.1). */
export interface EvalMetrics {
  /** Total cases in the dataset. */
  total: number
  /** Cases with an expected non-empty answer (not expectEmpty). */
  answerable: number
  /** Cases that declare an expectedTop1 (Top-1 denominator). */
  casesWithTop1: number
  /** Top-1: the expected component ranked first. */
  top1Hits: number
  /** Top-3: at least one accepted component within the top-K. */
  top3Hits: number
  precisionTop1: number
  precisionTop3: number
  /** Cases that returned no results at all (expected or not). */
  noResults: string[]
  /** Queries whose top-1 was not the expected component. */
  failedQueries: { query: string; expected: string; got: string[] }[]
  /**
   * False negatives: answerable queries where NO accepted component appeared
   * in the top-K (a legitimate answer was completely missed).
   */
  falseNegatives: { query: string; expected: string[]; got: string[] }[]
  /** False positives: results outside the accepted set (or non-empty for expectEmpty). */
  falsePositives: { query: string; unexpected: string[] }[]
  /** Negative/irrelevant queries correctly rejected with []. */
  negativesRejected: number
  /** Multi-answer cases reported for inspection. */
  ambiguous: { query: string; top: string[] }[]
}

/**
 * Runs the retriever against the evaluation dataset and computes
 * deterministic metrics (no randomness, no LLM).
 */
export function evaluateRetriever(retriever: Retriever, dataset: EvalCase[]): EvalMetrics {
  const metrics: EvalMetrics = {
    total: dataset.length,
    answerable: 0,
    casesWithTop1: 0,
    top1Hits: 0,
    top3Hits: 0,
    precisionTop1: 0,
    precisionTop3: 0,
    noResults: [],
    failedQueries: [],
    falseNegatives: [],
    falsePositives: [],
    negativesRejected: 0,
    ambiguous: [],
  }

  for (const testCase of dataset) {
    const results = retriever.search({ text: testCase.query, topK: 3 })
    const components = results.map((result) => result.component)
    const accepted =
      testCase.acceptedInTopK ?? (testCase.expectedTop1 ? [testCase.expectedTop1] : [])

    if (testCase.expectEmpty) {
      if (components.length === 0) {
        metrics.negativesRejected += 1
      } else {
        metrics.falsePositives.push({ query: testCase.query, unexpected: components })
      }
      continue
    }

    metrics.answerable += 1
    if (components.length === 0) {
      metrics.noResults.push(testCase.query)
    }

    // Top-1: only meaningful when a single expected answer exists.
    if (testCase.expectedTop1) {
      metrics.casesWithTop1 += 1
      if (components[0] === testCase.expectedTop1) {
        metrics.top1Hits += 1
      } else {
        metrics.failedQueries.push({
          query: testCase.query,
          expected: testCase.expectedTop1,
          got: components,
        })
      }
    }

    // Top-3: at least one accepted component in the results.
    if (accepted.some((candidate) => components.includes(candidate))) {
      metrics.top3Hits += 1
    } else {
      // False negative: a legitimate answer was missed entirely.
      metrics.falseNegatives.push({ query: testCase.query, expected: accepted, got: components })
    }

    // False positives: results outside the accepted set.
    const unexpected = components.filter((component) => !accepted.includes(component))
    if (unexpected.length > 0) {
      metrics.falsePositives.push({ query: testCase.query, unexpected })
    }

    // Ambiguity report (informative, not a failure).
    if (components.length > 1) {
      metrics.ambiguous.push({ query: testCase.query, top: components })
    }
  }

  metrics.precisionTop1 = metrics.casesWithTop1 > 0 ? metrics.top1Hits / metrics.casesWithTop1 : 0
  metrics.precisionTop3 = metrics.answerable > 0 ? metrics.top3Hits / metrics.answerable : 0

  return metrics
}
