// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import './test-utils/setup'
import { expectNoAxeViolations } from './test-utils/a11y'
import AssistantPage from './AssistantPage'
import type { AskResponse } from './api'

/** Fake fetch response (objeto plano — api.ts solo usa ok/status/json). */
const mockResponse = (data: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})

function groundedAnswer(overrides: Partial<AskResponse> = {}): AskResponse {
  return {
    requestId: 'req-test',
    answer: 'Usa Button con variant="primary" y size="md".',
    referencedComponents: ['button'],
    confidence: 'high',
    hasRelevantContext: true,
    providerId: 'mock',
    model: 'mock-1',
    retrieval: {
      query: 'como uso button',
      components: [{ component: 'button', score: 100 }],
      minScore: 20,
    },
    ...overrides,
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderAssistant() {
  return render(
    <MemoryRouter>
      <AssistantPage />
    </MemoryRouter>,
  )
}

async function submitQuestion(text: string): Promise<void> {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Tu pregunta'), text)
  await user.click(screen.getByRole('button', { name: 'Preguntar' }))
}

describe('AssistantPage (F5, P1)', () => {
  it('1. render inicial: formulario con label, textarea y botón deshabilitado', () => {
    renderAssistant()
    expect(screen.getByRole('heading', { name: 'Asistente' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tu pregunta')).toBeInTheDocument()
    const ask = screen.getByRole('button', { name: 'Preguntar' })
    // Sin pregunta no se puede enviar (nunca se llama a la API en vacío).
    expect(ask).toBeDisabled()
    expect(screen.queryByText('Respuesta')).not.toBeInTheDocument()
  })

  it('2. envío de pregunta: fetch a POST /api/ask con la pregunta', async () => {
    fetchMock.mockResolvedValue(mockResponse(groundedAnswer()))
    renderAssistant()
    await submitQuestion('¿Cómo uso Button?')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/ask')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ question: '¿Cómo uso Button?' })
  })

  it('3. loading: el botón queda disabled + aria-busy mientras la petición está en curso', async () => {
    let resolveFetch: (value: unknown) => void
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    renderAssistant()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Tu pregunta'), '¿Cómo uso Button?')
    await user.click(screen.getByRole('button', { name: 'Preguntar' }))
    const ask = screen.getByRole('button', { name: 'Preguntar' })
    expect(ask).toBeDisabled()
    expect(ask).toHaveAttribute('aria-busy', 'true')
    // No hay respuesta todavía.
    expect(screen.queryByText('Respuesta')).not.toBeInTheDocument()
    resolveFetch!(mockResponse(groundedAnswer()))
    await waitFor(() => expect(screen.getByText('Respuesta')).toBeInTheDocument())
  })

  it('4. respuesta grounded: se muestra el texto de la respuesta', async () => {
    fetchMock.mockResolvedValue(mockResponse(groundedAnswer()))
    renderAssistant()
    await submitQuestion('¿Cómo uso Button?')
    await waitFor(() =>
      expect(screen.getByText('Usa Button con variant="primary" y size="md".')).toBeInTheDocument(),
    )
  })

  it('5. fuentes: se listan como documentación (enlaces a las fichas), sin score', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(
        groundedAnswer({
          retrieval: {
            query: 'control de formulario',
            components: [
              { component: 'input', score: 30 },
              { component: 'select', score: 25 },
              { component: 'checkbox', score: 20 },
            ],
            minScore: 20,
          },
        }),
      ),
    )
    renderAssistant()
    await submitQuestion('control de formulario')
    const sources = await screen.findByRole('list')
    await within(sources).findByRole('link', { name: 'Input' })
    expect(within(sources).getByRole('link', { name: 'Select' })).toBeInTheDocument()
    expect(within(sources).getByRole('link', { name: 'Checkbox' })).toBeInTheDocument()
    // La jerga interna del retrieval no se muestra al usuario.
    expect(screen.queryByText(/score/)).toBeNull()
    expect(screen.queryByText(/minScore/)).toBeNull()
  })

  it('6. confidence: high/medium/low se muestran con el estado de grounding correcto', async () => {
    const user = userEvent.setup()
    for (const [confidence, label] of [
      ['high', 'Con contexto · confianza alta'],
      ['medium', 'Con contexto · confianza media'],
      ['low', 'Con contexto · confianza baja'],
    ] as const) {
      fetchMock.mockResolvedValue(mockResponse(groundedAnswer({ confidence })))
      const { unmount } = renderAssistant()
      await user.type(screen.getByLabelText('Tu pregunta'), 'pregunta')
      await user.click(screen.getByRole('button', { name: 'Preguntar' }))
      await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument())
      unmount()
    }
  })

  it('7. refusal: sin contexto → estado "Sin contexto relevante", sin fuentes', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(
        groundedAnswer({
          answer: 'No existe documentación relevante recuperada para esta consulta.',
          referencedComponents: [],
          confidence: 'none',
          hasRelevantContext: false,
          retrieval: { query: 'Necesito un DatePicker', components: [], minScore: 20 },
        }),
      ),
    )
    renderAssistant()
    await submitQuestion('Necesito un DatePicker')
    await waitFor(() => expect(screen.getByText('Sin contexto relevante')).toBeInTheDocument())
    expect(
      screen.getByText('No existe documentación relevante recuperada para esta consulta.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No se recuperó documentación relevante para esta pregunta.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('8. error HTTP: se muestra un error amigable sin romper la página', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ error: { code: 'internal', message: 'Internal server error.' } }, 500),
    )
    renderAssistant()
    await submitQuestion('¿Cómo uso Button?')
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Algo salió mal en el servidor. Vuelve a intentarlo.',
      ),
    )
    // El texto del error interno del servidor nunca se muestra.
    expect(screen.queryByText('Internal server error.')).not.toBeInTheDocument()
    // El formulario sigue usable.
    expect(screen.getByRole('button', { name: 'Preguntar' })).toBeEnabled()
  })

  it('9. pregunta vacía: el botón permanece deshabilitado y la API nunca se llama', async () => {
    renderAssistant()
    const ask = screen.getByRole('button', { name: 'Preguntar' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Tu pregunta'), '   ')
    expect(ask).toBeDisabled()
    await user.clear(screen.getByLabelText('Tu pregunta'))
    expect(ask).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('10. fuentes inexistentes: nunca se muestran componentes fuera del retrieval', async () => {
    // El LLM (mock) menciona DatePicker y Card en el texto, pero el retrieval
    // solo contiene button. La UI solo puede mostrar lo que llegó en
    // retrieval.components — es imposible que muestre DatePicker/Card.
    fetchMock.mockResolvedValue(
      mockResponse(
        groundedAnswer({
          answer: 'Puedes usar DatePicker y Card, además de Button.',
          referencedComponents: ['button'],
          retrieval: {
            query: 'como uso button',
            components: [{ component: 'button', score: 100 }],
            minScore: 20,
          },
        }),
      ),
    )
    renderAssistant()
    await submitQuestion('¿Cómo uso Button?')
    const sources = await screen.findByRole('list')
    expect(within(sources).getByRole('link', { name: 'Button' })).toBeInTheDocument()
    expect(within(sources).queryByText('DatePicker')).toBeNull()
    expect(within(sources).queryByText('Card')).toBeNull()
  })

  it('11. accesibilidad básica: sin violaciones axe en estado inicial y tras respuesta', async () => {
    fetchMock.mockResolvedValue(mockResponse(groundedAnswer()))
    const { container } = renderAssistant()
    await expectNoAxeViolations(container)
    await submitQuestion('¿Cómo uso Button?')
    await waitFor(() => expect(screen.getByText('Respuesta')).toBeInTheDocument())
    await expectNoAxeViolations(container)
  })

  it('12. integración con la API mediante mock: pregunta → respuesta grounded → fuentes', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(
        groundedAnswer({
          answer: 'Usa Select para elegir una opción.',
          retrieval: {
            query: '¿Qué componente sirve para seleccionar una opción?',
            components: [{ component: 'select', score: 60 }],
            minScore: 20,
          },
        }),
      ),
    )
    renderAssistant()
    await submitQuestion('¿Qué componente sirve para seleccionar una opción?')
    await waitFor(() =>
      expect(screen.getByText('Usa Select para elegir una opción.')).toBeInTheDocument(),
    )
    expect(screen.getByText('Con contexto · confianza alta')).toBeInTheDocument()
    const sources = screen.getByRole('list')
    expect(within(sources).getByRole('link', { name: 'Select' })).toBeInTheDocument()
    // El modelo interno del proveedor nunca se muestra.
    expect(screen.queryByText('mock-1')).toBeNull()
  })
})
