/**
 * Public contracts of the knowledge layer (F5).
 *
 * The knowledge layer is the only consumer of component metadata that is
 * allowed to interpret it: it normalizes the raw metadata into a corpus that
 * is small, deterministic and ready for retrieval. No LLM, embeddings or
 * vector database is involved — retrieval is pure, tested logic.
 */

/** A canonical, copyable example of a component. */
export interface Example {
  /** Stable example id, e.g. 'primary'. */
  id: string
  title: string
  description: string
  /** Canonical, complete example code (single source of truth: *.examples.tsx). */
  code: string
}

/** A public prop of a component after filtering inherited HTML props. */
export interface ComponentProp {
  name: string
  required: boolean
  type: string
  defaultValue?: string | boolean
  description?: string
}

/** Identity + recoverable content of a knowledge document. */
export interface KnowledgeDocument {
  /** Stable identity, e.g. 'ods-ai/button'. */
  id: string
  kind: 'component'
  name: string
  /** Slug / canonical route segment, e.g. 'button'. */
  component: string
  description: string
  tags: string[]
  variants: string[]
  sizes?: string[]
  a11ySummary: string
  /** Canonical route in the docs app. */
  url: string
}

/** A component normalized and filtered for retrieval. */
export interface ComponentKnowledge extends KnowledgeDocument {
  /** Only the component's own public API — inherited HTML props removed. */
  props: ComponentProp[]
  /** Token paths (dot format) used by the component CSS. */
  tokensUsed: string[]
  examples: Example[]
  /** Canonical source path in the repository. */
  sourcePath: string
}

/** Input of a retrieval query. */
export interface RetrievalQuery {
  text: string
  /** Maximum number of results to return. Default: 3. */
  topK?: number
}

/** A single retrieval result with an explainable score. */
export interface RetrievalResult {
  /** Component slug, e.g. 'button'. */
  component: string
  /** Deterministic relevance score (higher is better). */
  score: number
  /** Query terms (normalized) that contributed to the score. */
  matchedTerms: string[]
  /** Human-readable reasons explaining why this component was retrieved. */
  reasons: string[]
}

/** Deterministic retriever over a component corpus. */
export interface Retriever {
  search(query: RetrievalQuery): RetrievalResult[]
}
