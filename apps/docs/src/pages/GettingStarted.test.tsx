// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../assistant/test-utils/setup'
import GettingStarted from './GettingStarted'

describe('Guía de inicio (P1)', () => {
  it('1. renderiza el título y todas las secciones del recorrido', () => {
    render(<GettingStarted />)
    expect(screen.getByRole('heading', { name: 'Guía de inicio' })).toBeInTheDocument()
    for (const heading of [
      'Requisitos',
      '1. Crea la aplicación',
      '2. Entra en el proyecto',
      '3. Instala las dependencias',
      '4. Importa los tokens',
      '5. Muestra tu primer Button',
      '6. El sistema de temas',
      '7. Ejecuta la aplicación',
      'Un ejemplo completo: FormField + Input + Button',
      'Accesibilidad',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('2. el recorrido completo es copiable y usa comandos/APIs reales', () => {
    render(<GettingStarted />)
    expect(
      screen.getByText('npm create vite@latest my-app -- --template react-ts'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('npm install react react-dom @ods-ai/react @ods-ai/tokens'),
    ).toBeInTheDocument()
    // Aparece en el paso 4 y en el ejemplo completo.
    expect(screen.getAllByText(/import '@ods-ai\/tokens\/tokens\.css'/).length).toBeGreaterThan(0)
    expect(screen.getByText('npm run dev')).toBeInTheDocument()
    // 8 bloques de código con su botón de copiar.
    expect(screen.getAllByRole('button', { name: 'Copiar código' })).toHaveLength(8)
  })

  it('3. el ejemplo en vivo usa componentes reales del DS', () => {
    render(<GettingStarted />)
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
  })
})
