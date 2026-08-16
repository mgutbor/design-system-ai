// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../assistant/test-utils/setup'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('boom stack interno')
}

describe('ErrorBoundary (V1-0, P2-2)', () => {
  it('captura el error y muestra un fallback en español sin exponer stack traces', () => {
    // React registra el error en console.error en dev; lo silenciamos en el test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recargar página' })).toBeInTheDocument()
    // Ni el mensaje interno ni el stack trace llegan al DOM.
    expect(screen.queryByText(/boom stack interno/)).toBeNull()
    expect(document.body.textContent).not.toContain('ErrorBoundary.test')
    spy.mockRestore()
  })

  it('no interfiere cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>Contenido normal</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Contenido normal')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal')).toBeNull()
  })
})
