import type { ComponentKnowledge, ComponentProp } from '../types'
import type { MetadataInput } from './metadataInput'
import { ownPropsFor } from './ownProps'

/**
 * Prop filtering strategy (documented in docs/knowledge.md, F5.1 audit).
 *
 * The raw metadata from react-docgen-typescript contains ~290 inherited props
 * per HTML-based component. The corpus keeps ONLY the component's own public
 * API, defined by the explicit per-component whitelist OWN_PROPS_BY_COMPONENT
 * (derived from each component's public types and validated against the real
 * metadata JSON by tests). Inherited HTML attributes — aria-*, data-*, DOM
 * handlers, styling/identity attributes and relevant native attributes like
 * disabled/required/value — never appear as API.
 *
 * Rationale (F5.1): a denylist cannot classify ambiguous attributes (`title`
 * is a global HTML attribute AND Modal's own prop; `size` is inherited on
 * Input/Select but own on Button/Spinner). A small explicit whitelist is the
 * only deterministic way to guarantee "Button → variant, size, loading" and
 * nothing else.
 */

function filterProps(entry: MetadataInput): ComponentProp[] {
  const own = new Set(ownPropsFor(entry.component))
  return entry.props
    .filter((prop) => own.has(prop.name))
    .map(({ name, required, type, defaultValue, description }) => ({
      name,
      required,
      type,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(description !== undefined ? { description } : {}),
    }))
}

/**
 * Normalizes raw component metadata into a retrieval-ready corpus.
 * Pure function: same input always yields the same output (deterministic).
 */
export function buildCorpus(metadata: MetadataInput[]): ComponentKnowledge[] {
  return metadata.map((entry) => ({
    id: entry.id,
    kind: 'component',
    name: entry.name,
    component: entry.component,
    description: entry.description,
    tags: [...entry.tags],
    variants: [...entry.variants],
    ...(entry.sizes ? { sizes: [...entry.sizes] } : {}),
    a11ySummary: entry.a11ySummary,
    url: entry.url,
    props: filterProps(entry),
    tokensUsed: [...entry.tokensUsed],
    examples: entry.examples.map((example) => ({ ...example })),
    sourcePath: entry.sourcePath,
  }))
}
