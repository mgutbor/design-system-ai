// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { tokens } from '@ods-ai/tokens'
import { expectNoAxeViolations } from '../assistant/test-utils/a11y'
import '../assistant/test-utils/setup'
import { CONTRAST_PAIRS, SEMANTIC_REFS } from '../data/tokens-data.generated'
import { contrastRatio } from '../utils/contrast'
import Tokens from './Tokens'

function flatten(node: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.push(path)
    else out.push(...flatten(value as Record<string, unknown>, path))
  }
  return out
}

function lookup(node: Record<string, unknown>, path: string): string {
  let current: Record<string, unknown> | string | undefined = node
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null)
      throw new Error(`token no resuelto: ${path}`)
    current = current[segment] as Record<string, unknown> | string | undefined
  }
  if (typeof current !== 'string') throw new Error(`token no resuelto: ${path}`)
  return current
}

const tokensObject = tokens as unknown as Record<string, unknown>
const allPaths = flatten(tokensObject)
const semanticPaths = new Set(Object.keys(SEMANTIC_REFS))
const primitivePaths = allPaths.filter((path) => !semanticPaths.has(path))
const primitiveColorPaths = primitivePaths.filter((path) => path.startsWith('color.'))

describe('Tokens — Foundations (P1)', () => {
  it('1. muestra todas las categorías reales del sistema de tokens', () => {
    render(<Tokens />)
    for (const name of [
      'Tokens de diseño',
      'Cómo usar los tokens',
      'Color',
      'Tipografía',
      'Espacio',
      'Radio',
      'Movimiento',
      'Z-index',
      'Contraste y accesibilidad',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })

  it('2. no muestra categorías inexistentes (sombra, elevación, breakpoint, contenedor)', () => {
    render(<Tokens />)
    for (const name of ['Sombra', 'Elevación', 'Breakpoint', 'Contenedor']) {
      expect(screen.queryByRole('heading', { name })).toBeNull()
    }
  })

  it('3. los tokens semánticos mostrados proceden de los datos reales (18, con su referencia)', () => {
    render(<Tokens />)
    const color = screen.getByRole('region', { name: 'Color' })
    const semanticRows = within(color)
      .getAllByRole('row')
      .filter((row) => {
        const th = row.querySelector('th[scope="row"]')
        return th?.textContent?.startsWith('color.')
      })
    expect(semanticRows).toHaveLength(Object.keys(SEMANTIC_REFS).length)
    for (const [path, ref] of Object.entries(SEMANTIC_REFS)) {
      expect(within(color).getByText(path)).toBeInTheDocument()
      expect(within(color).getAllByText(ref).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('4. los primitivos de color mostrados proceden de los datos reales (34)', () => {
    render(<Tokens />)
    const color = screen.getByRole('region', { name: 'Color' })
    const primitiveRows = within(color)
      .getAllByRole('row')
      .filter((row) => {
        const th = row.querySelector('th[scope="row"]')
        const text = th?.textContent ?? ''
        return text.length > 0 && !text.startsWith('color.')
      })
    expect(primitiveRows).toHaveLength(primitiveColorPaths.length)
    for (const path of primitiveColorPaths) {
      const label = path.split('.').slice(1).join('.')
      expect(within(color).getAllByText(label).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('5. los primitivos de las demás escalas aparecen con su variable y valor reales', () => {
    render(<Tokens />)
    for (const cssName of [
      '--space-4',
      '--radius-full',
      '--font-size-md',
      '--motion-duration-fast',
      '--zindex-modal',
    ]) {
      expect(screen.getByText(cssName)).toBeInTheDocument()
    }
    for (const value of ['1rem', '9999px', '100ms', '3000']) {
      expect(screen.getAllByText(value).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('6. copiar muestra feedback accesible (Copiado + aria-live) al copiar la CSS variable', async () => {
    // jsdom 30 expone navigator.clipboard nativo (writeText resuelve): el test
    // verifica el comportamiento visible; el contenido real del portapapeles se
    // comprueba en el E2E con navegador real (e2e/tests/tokens.spec.ts).
    const user = userEvent.setup()
    render(<Tokens />)
    const button = screen.getByRole('button', { name: 'Copiar --color-action-primary' })
    await user.click(button)
    expect(button).toHaveTextContent('Copiado')
    const statuses = screen.getAllByRole('status')
    expect(statuses.some((status) => status.textContent === 'Copiado --color-action-primary')).toBe(
      true,
    )
  })

  it('7. la guía de uso contiene ejemplos reales verificados', () => {
    render(<Tokens />)
    expect(screen.getByText(/var\(--color-text-default\)/)).toBeInTheDocument()
    expect(screen.getByText(/var\(--color-action-primary\)/)).toBeInTheDocument()
    expect(screen.getByText(/getToken\('color\.action\.primary'\)/)).toBeInTheDocument()
    expect(screen.getByText(/tokens\.space\[4\]/)).toBeInTheDocument()
    expect(screen.getByText('<html data-theme="dark">')).toBeInTheDocument()
  })

  it('8. contraste: los 23 pares reales con ratio computado y criterio', () => {
    render(<Tokens />)
    const contrast = screen.getByRole('region', { name: 'Contraste y accesibilidad' })
    expect(within(contrast).getAllByRole('row')).toHaveLength(
      Object.keys(CONTRAST_PAIRS).length + 1,
    )

    const expected = contrastRatio(
      lookup(tokensObject, 'color.text.default'),
      lookup(tokensObject, 'color.surface.background'),
    )
    expect(within(contrast).getByText(`${expected.toFixed(2)}:1 ✓`)).toBeInTheDocument()
    expect(within(contrast).getAllByText('≥ 4.5:1 (texto normal)').length).toBeGreaterThanOrEqual(1)
    expect(
      within(contrast).getAllByText('≥ 3:1 (texto grande y UI)').length,
    ).toBeGreaterThanOrEqual(1)
    // Sin CSS cargado en jsdom el probe dark está vacío: la columna oscura degrada a «—».
    expect(within(contrast).getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('9. el probe del tema oscuro sigue presente y la tabla semántica tiene columna Oscuro', () => {
    render(<Tokens />)
    expect(document.querySelector('[data-theme="dark"]')).not.toBeNull()
    const color = screen.getByRole('region', { name: 'Color' })
    expect(
      within(color).getAllByRole('columnheader', { name: 'Oscuro' }).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('10. no tiene violaciones axe', async () => {
    const { container } = render(<Tokens />)
    await expectNoAxeViolations(container)
  })
})
