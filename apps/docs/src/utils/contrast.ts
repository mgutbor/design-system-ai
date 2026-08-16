/**
 * Contraste WCAG — misma fórmula y reglas que packages/tokens/src/validate.ts
 * (parseHex / srgbToLinear / luminance / contrastRatio). El ratio es un dato
 * DERIVADO: los tests de paridad (utils/contrast.test.ts) comparan esta
 * implementación con validate.ts para todos los pares de contrast.json, de
 * modo que cualquier divergencia rompe CI.
 */
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function parseHex(hex: string): [number, number, number] {
  const match = HEX_PATTERN.exec(hex)
  if (!match) return [0, 0, 0]
  const n = parseInt(match[0].slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function srgbToLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function contrastRatio(a: string, b: string): number {
  const [hi = 1, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
