import componentMetadata from '@ods-ai/react/metadata'
import { buildCorpus } from './corpus/buildCorpus'
import { createRetriever, WEIGHTS } from './retriever/retriever'
import { SYNONYMS } from './retriever/synonyms'
import { buildContext } from './context/buildContext'
import type {
  ComponentKnowledge,
  ComponentProp,
  Example,
  KnowledgeDocument,
  RetrievalQuery,
  RetrievalResult,
  Retriever,
} from './types'

export type {
  ComponentKnowledge,
  ComponentProp,
  Example,
  KnowledgeDocument,
  RetrievalQuery,
  RetrievalResult,
  Retriever,
}

export { buildCorpus, buildContext, createRetriever, SYNONYMS, WEIGHTS }

/** Corpus built from the real metadata JSON produced by @ods-ai/react. */
export const corpus: ComponentKnowledge[] = buildCorpus(componentMetadata)

/** Default deterministic retriever over the real corpus. */
export const retriever: Retriever = createRetriever(corpus)
