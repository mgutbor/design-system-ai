import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { generateOwnPropsArtifact } from '../../scripts/generate-own-props'

const here = dirname(fileURLToPath(import.meta.url))
const ARTIFACT_PATH = join(here, 'own-props.generated.ts')

describe('own-props.generated.ts (frescura)', () => {
  it('está sincronizado con OWN_PROPS_BY_COMPONENT (packages/knowledge)', () => {
    const committed = readFileSync(ARTIFACT_PATH, 'utf8')
    const current = generateOwnPropsArtifact()
    expect(
      current,
      'El artefacto generado está desactualizado respecto a la fuente de verdad. Regenera con: pnpm generate:docs-own-props',
    ).toBe(committed)
  })
})
