import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { generateTokensDataArtifact } from '../../scripts/generate-tokens-data'
import { CONTRAST_PAIRS, SEMANTIC_REFS } from './tokens-data.generated'

const here = dirname(fileURLToPath(import.meta.url))
const ARTIFACT_PATH = join(here, 'tokens-data.generated.ts')

describe('tokens-data.generated.ts (frescura)', () => {
  it('está sincronizado con packages/tokens/src/tokens (semantic/*.json y contrast.json)', () => {
    const committed = readFileSync(ARTIFACT_PATH, 'utf8')
    expect(
      generateTokensDataArtifact(),
      'El artefacto generado está desactualizado respecto a los fuentes de tokens. Regenera con: pnpm generate:docs-tokens-data',
    ).toBe(committed)
  })

  it('contiene los 18 semánticos y los 23 pares de contraste reales', () => {
    expect(Object.keys(SEMANTIC_REFS)).toHaveLength(18)
    expect(Object.keys(CONTRAST_PAIRS)).toHaveLength(23)
    // Referencia real verificada en packages/tokens/src/tokens/semantic/color.json.
    expect(SEMANTIC_REFS['color.action.primary']).toBe('color.blue.600')
    for (const pair of Object.values(CONTRAST_PAIRS)) {
      // Criterios WCAG del validador: 4.5:1 (texto normal) o 3:1 (texto grande/UI).
      expect([4.5, 3]).toContain(pair.target)
      expect(pair.fg).toMatch(/^color\./)
      expect(pair.bg).toMatch(/^color\./)
    }
  })
})
