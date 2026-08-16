// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { type ComponentMetadata } from '@ods-ai/react'
import componentMetadata from '@ods-ai/react/metadata'
import '../assistant/test-utils/setup'
import Home from './Home'

const metadata = componentMetadata as ComponentMetadata[]

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home (V1-0, P2-1) — sin drift con la metadata', () => {
  it('lista exactamente los componentes de la metadata (misma fuente que /components)', () => {
    renderHome()
    const section = screen.getByRole('region', { name: 'Componentes' })
    const links = within(section).getAllByRole('link')
    expect(links).toHaveLength(metadata.length)
    for (const entry of metadata) {
      const link = within(section).getByRole('link', { name: entry.name })
      expect(link).toHaveAttribute('href', entry.url)
    }
  })

  it('no contiene arrays hardcodeados de componentes (protección contra el drift)', () => {
    renderHome()
    const section = screen.getByRole('region', { name: 'Componentes' })
    // Si alguien reintroduce una lista manual, el número de enlaces dejaría de
    // coincidir con la metadata y este test falla (el primer test ya lo cubre);
    // aquí se verifica además que los slugs mostrados son exactamente los reales.
    const slugs = within(section)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    const expected = metadata.map((entry) => entry.url)
    expect(slugs.sort()).toEqual(expected.sort())
  })
})
