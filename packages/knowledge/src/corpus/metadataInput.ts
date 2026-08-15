/**
 * Structural input type for the corpus builder.
 *
 * Deliberately local: knowledge only needs the subset of the raw metadata
 * JSON that it interprets. Importing `ComponentMetadata` from @ods-ai/react
 * would pull the whole react package (with its CSS modules) into this
 * package's type graph — an unnecessary coupling for a pure data consumer.
 */
export interface MetadataInput {
  id: string
  kind: string
  name: string
  component: string
  description: string
  props: Array<{
    name: string
    required: boolean
    type: string
    defaultValue?: string | boolean
    description?: string
  }>
  variants: string[]
  sizes?: string[]
  tokensUsed: string[]
  examples: Array<{
    id: string
    title: string
    description: string
    code: string
  }>
  tags: string[]
  a11ySummary: string
  url: string
  sourcePath: string
}
