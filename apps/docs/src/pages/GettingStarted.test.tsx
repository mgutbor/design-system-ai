// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../assistant/test-utils/setup'
import GettingStarted from './GettingStarted'

describe('GettingStarted (P0)', () => {
  it('1. renderiza el título y las secciones principales', () => {
    render(<GettingStarted />)
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument()
    for (const heading of [
      'Requirements',
      'Installation',
      'Import the tokens',
      'Your first Button',
      'A complete example: FormField + Input + Button',
      'Accessibility',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('2. expone comandos y código copiable reales', () => {
    render(<GettingStarted />)
    expect(screen.getByText('npm install @ods-ai/react @ods-ai/tokens')).toBeInTheDocument()
    expect(screen.getByText("import '@ods-ai/tokens/tokens.css'")).toBeInTheDocument()
    expect(screen.getByText(/import \{ Button \} from '@ods-ai\/react'/)).toBeInTheDocument()
    // 5 bloques de código con su botón de copiar.
    expect(screen.getAllByRole('button', { name: 'Copy code' })).toHaveLength(5)
  })

  it('3. el ejemplo en vivo usa componentes reales del DS', () => {
    render(<GettingStarted />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })
})
