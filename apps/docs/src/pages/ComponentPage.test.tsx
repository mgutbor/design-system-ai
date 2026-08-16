// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import componentMetadata from '@ods-ai/react/metadata'
import type { ComponentMetadata } from '@ods-ai/react'
import { ownPropsFor } from '../data/own-props.generated'
import '../assistant/test-utils/setup'
import ComponentPage from './ComponentPage'

const metadata = componentMetadata as ComponentMetadata[]

/** Nº de props heredadas esperado: total de la metadata − props propias. */
function inheritedCount(slug: string): number {
  const entry = metadata.find((item) => item.component === slug)!
  return entry.props.length - ownPropsFor(slug).length
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="components/:slug" element={<ComponentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ComponentPage — API pública (P0)', () => {
  it('1. la tabla API principal muestra únicamente las props propias de Button', () => {
    renderAt('/components/button')
    const api = screen.getAllByRole('table')[0]!
    for (const own of ['variant', 'size', 'loading']) {
      expect(within(api).getByRole('rowheader', { name: own })).toBeInTheDocument()
    }
    // Las props HTML/ARIA heredadas no dominan la documentación.
    for (const inherited of ['onClick', 'aria-label', 'className']) {
      expect(within(api).queryByRole('rowheader', { name: inherited })).toBeNull()
    }
  })

  it('2. las props heredadas viven en una sección colapsable con su recuento', () => {
    renderAt('/components/button')
    const details = document.querySelector('details')
    expect(details).not.toBeNull()
    // Colapsable por defecto: el contenido se revela con el <details> nativo.
    expect(details!.open).toBe(false)

    const expectedInherited = inheritedCount('button')
    const summary = within(details!).getByText(
      new RegExp(`Atributos HTML y ARIA \\(heredados\\) — ${expectedInherited} props`),
    )
    expect(summary).toHaveTextContent(
      `Atributos HTML y ARIA (heredados) — ${expectedInherited} props`,
    )

    // La tabla heredada vive dentro del <details> y contiene props reales.
    const inheritedTable = within(details!).getAllByRole('table')[0]!
    expect(within(inheritedTable).getByRole('rowheader', { name: 'onClick' })).toBeInTheDocument()
    expect(
      within(inheritedTable).getByRole('rowheader', { name: 'aria-label' }),
    ).toBeInTheDocument()
  })

  it('3. componente inexistente: página de "no encontrado" sin inventar componentes', () => {
    renderAt('/components/date-picker')
    expect(screen.getByRole('heading', { name: 'Componente no encontrado' })).toBeInTheDocument()
  })

  it('4. FormField documenta solo sus props propias (label, htmlFor, description, error, children)', () => {
    renderAt('/components/form-field')
    const api = screen.getAllByRole('table')[0]!
    // label y children son required: el nombre accesible lleva el marcador "*".
    const byName = (own: string) => new RegExp(`^${own}\\*?$`)
    for (const own of ['label', 'htmlFor', 'description', 'error', 'children']) {
      expect(within(api).getByRole('rowheader', { name: byName(own) })).toBeInTheDocument()
    }
    expect(within(api).queryByRole('rowheader', { name: 'aria-invalid' })).toBeNull()
  })
})
