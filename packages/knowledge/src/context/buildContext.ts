import type { ComponentKnowledge, RetrievalResult } from '../types'

/**
 * Builds compact LLM-ready context from retrieval results.
 *
 * Only information useful to answer a question is included: identity, API
 * (own props only — inherited HTML props are already filtered by the corpus),
 * variants/sizes, tokens, canonical examples and accessibility. No raw
 * metadata dumps, no inherited HTML attributes.
 */

function formatProps(component: ComponentKnowledge): string {
  return component.props
    .map((prop) => {
      const required = prop.required ? ' (required)' : ''
      const defaultValue = prop.defaultValue ? ` = ${prop.defaultValue}` : ''
      return `- ${prop.name}${required}: ${prop.type}${defaultValue}`
    })
    .join('\n')
}

function formatExamples(component: ComponentKnowledge): string {
  return component.examples.map((example) => `### ${example.title}\n${example.code}`).join('\n\n')
}

/** Converts retrieval results into a compact, grounded context string. */
export function buildContext(results: RetrievalResult[], corpus: ComponentKnowledge[]): string {
  if (results.length === 0) {
    return 'No relevant documentation found for this query.'
  }

  // Sort by component slug so the output is stable regardless of the input
  // order: buildContext is a pure function of the SET of results, not their
  // ordering (F5.1 determinism requirement).
  const ordered = [...results].sort((a, b) => a.component.localeCompare(b.component))

  const sections = ordered.map((result) => {
    const component = corpus.find((entry) => entry.component === result.component)
    if (!component) return ''

    const parts: string[] = []
    parts.push(`# ${component.name} (${result.component})`)
    parts.push(component.description)
    parts.push(`URL: ${component.url}`)

    if (component.variants.length > 0) {
      parts.push(`Variants: ${component.variants.join(', ')}`)
    }
    if (component.sizes) {
      parts.push(`Sizes: ${component.sizes.join(', ')}`)
    }

    parts.push('## API')
    parts.push(formatProps(component))

    if (component.tokensUsed.length > 0) {
      parts.push('## Design tokens')
      parts.push(component.tokensUsed.join(', '))
    }

    parts.push('## Accessibility')
    parts.push(component.a11ySummary)

    if (component.examples.length > 0) {
      parts.push('## Canonical examples')
      parts.push(formatExamples(component))
    }

    return parts.join('\n')
  })

  return sections.filter(Boolean).join('\n\n---\n\n')
}
