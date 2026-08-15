import type { ComponentKnowledge, RetrievalQuery, RetrievalResult, Retriever } from '../types'
import { SYNONYMS } from './synonyms'

/**
 * Scoring weights (documented in docs/knowledge.md).
 *
 * Priority (higher signal first): component name > tags > variants > props >
 * tokens > description/a11y > examples. Exact name match dominates because a
 * synonym like "boton" resolving to the component "button" is the strongest
 * signal available. Lower-weight fields (description, examples) only nudge
 * the ranking when names/tags/variants do not discriminate.
 */
export const WEIGHTS = {
  nameExact: 100,
  nameContains: 60,
  tagExact: 30,
  variantExact: 25,
  propExact: 20,
  tokenContains: 10,
  descriptionContains: 5,
  a11yContains: 5,
  exampleContains: 3,
} as const

/** Minimum token length considered for matching (ignores stop words like "de"). */
const MIN_TOKEN_LENGTH = 3

/**
 * Minimum absolute score for a result to be returned. Weak signals such as a
 * single example match (weight 3) must not, on their own, surface a component:
 * returning [] is better than a speculative hit. Tag/prop/variant matches
 * (>= 15) always pass.
 */
const MIN_RESULT_SCORE = 10

/** Normalizes text: lowercase + strip accents (NFD) + collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
}

interface ExpandedTerm {
  value: string
  /** Whether the term comes from a synonym (kept for reasons/debugging). */
  synonymOf?: string
}

/**
 * Expands a query into search terms.
 *
 * - If the whole normalized query is a known phrase ("casilla de seleccion"),
 *   it expands to that single target: phrases have a meaning of their own and
 *   must not be diluted by token-level synonyms.
 * - Otherwise each token (len >= 3) is kept as-is and expanded through
 *   SYNONYMS. A compound synonym ("form-field") also yields its parts
 *   ("form", "field") so that tags of related components can match.
 */
export function expandQuery(text: string): ExpandedTerm[] {
  const normalized = normalizeText(text)
  const phraseTarget = SYNONYMS[normalized]
  if (phraseTarget) {
    return [{ value: phraseTarget }]
  }

  const terms: ExpandedTerm[] = []
  for (const token of tokenize(text)) {
    terms.push({ value: token })
    const target = SYNONYMS[token]
    if (target) {
      terms.push({ value: target, synonymOf: token })
      if (target.includes('-')) {
        for (const part of target.split('-')) {
          if (part.length >= MIN_TOKEN_LENGTH) terms.push({ value: part, synonymOf: token })
        }
      }
    }
  }
  return terms
}

interface ScoreBreakdown {
  score: number
  matchedTerms: string[]
  reasons: string[]
}

function scoreComponent(component: ComponentKnowledge, terms: ExpandedTerm[]): ScoreBreakdown {
  const slug = component.component
  const name = component.name.toLowerCase()
  let score = 0
  const matchedTerms = new Set<string>()
  const reasons: string[] = []

  for (const term of terms) {
    const value = term.value
    const matched = term.synonymOf ?? value

    // 1. Name — exact slug match is the strongest signal.
    if (value === slug) {
      score += WEIGHTS.nameExact
      matchedTerms.add(matched)
      reasons.push(`name "${name}" matches "${matched}"`)
      continue
    }
    if (value.length >= MIN_TOKEN_LENGTH && slug.includes(value)) {
      score += WEIGHTS.nameContains
      matchedTerms.add(matched)
      reasons.push(`name "${name}" contains "${matched}"`)
      continue
    }

    // 2. Tags.
    if (component.tags.includes(value)) {
      score += WEIGHTS.tagExact
      matchedTerms.add(matched)
      reasons.push(`tag "${value}" matches "${matched}"`)
      continue
    }

    // 3. Variants.
    if (component.variants.includes(value)) {
      score += WEIGHTS.variantExact
      matchedTerms.add(matched)
      reasons.push(`variant "${value}" matches "${matched}"`)
      continue
    }

    // 4. Public props (own API, inherited props already filtered).
    if (component.props.some((prop) => prop.name === value)) {
      score += WEIGHTS.propExact
      matchedTerms.add(matched)
      reasons.push(`prop "${value}" matches "${matched}"`)
      continue
    }

    // 5. Design tokens used by the component.
    if (component.tokensUsed.some((token) => token.includes(value))) {
      score += WEIGHTS.tokenContains
      matchedTerms.add(matched)
      reasons.push(`token "${value}" matches "${matched}"`)
      continue
    }

    // 6. Description / a11y — weak signals, only for long tokens.
    if (value.length >= 4) {
      if (normalizeText(component.description).includes(value)) {
        score += WEIGHTS.descriptionContains
        matchedTerms.add(matched)
        reasons.push(`description matches "${matched}"`)
        continue
      }
      if (normalizeText(component.a11ySummary).includes(value)) {
        score += WEIGHTS.a11yContains
        matchedTerms.add(matched)
        reasons.push(`accessibility summary matches "${matched}"`)
        continue
      }
      if (
        component.examples.some(
          (example) =>
            normalizeText(example.title).includes(value) ||
            normalizeText(example.description).includes(value),
        )
      ) {
        score += WEIGHTS.exampleContains
        matchedTerms.add(matched)
        reasons.push(`example matches "${matched}"`)
      }
    }
  }

  return { score, matchedTerms: [...matchedTerms], reasons: [...new Set(reasons)] }
}

/** Creates a deterministic retriever over a corpus. */
export function createRetriever(corpus: ComponentKnowledge[]): Retriever {
  return {
    search(query: RetrievalQuery): RetrievalResult[] {
      const topK = Math.max(1, Math.floor(query.topK ?? 3))
      const terms = expandQuery(query.text)
      if (terms.length === 0) return []

      return corpus
        .map((component) => {
          const { score, matchedTerms, reasons } = scoreComponent(component, terms)
          return { component: component.component, score, matchedTerms, reasons }
        })
        .filter((result) => result.score >= MIN_RESULT_SCORE)
        .sort((a, b) => b.score - a.score || a.component.localeCompare(b.component))
        .slice(0, topK)
    },
  }
}
