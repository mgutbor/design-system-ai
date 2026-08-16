// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { tokens } from '@ods-ai/tokens'
import { contrastRatio as validateContrastRatio } from '../../../../packages/tokens/src/validate.ts'
import { CONTRAST_PAIRS } from '../data/tokens-data.generated'
import { contrastRatio } from './contrast'

function lookup(node: Record<string, unknown>, path: string): string {
  let current: Record<string, unknown> | string | undefined = node
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      throw new Error(`token no resuelto: ${path}`)
    }
    current = current[segment] as Record<string, unknown> | string | undefined
  }
  if (typeof current !== 'string') throw new Error(`token no resuelto: ${path}`)
  return current
}

const tokensObject = tokens as unknown as Record<string, unknown>

describe('contrast (paridad con packages/tokens/src/validate.ts)', () => {
  it('la fórmula coincide con validate.ts para todos los pares (valores light reales)', () => {
    for (const pair of Object.values(CONTRAST_PAIRS)) {
      const fg = lookup(tokensObject, pair.fg)
      const bg = lookup(tokensObject, pair.bg)
      expect(contrastRatio(fg, bg)).toBe(validateContrastRatio(fg, bg))
    }
  })

  it('ancla conocida: blanco sobre negro = 21:1 (WCAG)', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 10)
    expect(validateContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 10)
  })

  it('todos los pares cumplen su criterio en light (regla que aplica validate.ts)', () => {
    for (const [id, pair] of Object.entries(CONTRAST_PAIRS)) {
      const ratio = contrastRatio(lookup(tokensObject, pair.fg), lookup(tokensObject, pair.bg))
      expect(
        ratio,
        `par "${id}": ${ratio.toFixed(2)}:1 no alcanza el criterio ${pair.target}:1`,
      ).toBeGreaterThanOrEqual(pair.target)
    }
  })
})
