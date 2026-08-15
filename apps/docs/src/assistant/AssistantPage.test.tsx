// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    answer: 'Use Button with variant="primary" and size="md".',
    referencedComponents: ['button'],
    confidence: 'high',
    hasRelevantContext: true,
    providerId: 'mock',
    model: 'mock-1',
    retrieval: {
      query: 'how do i use button',
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

async function submitQuestion(text: string): Promise<void> {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Your question'), text)
  await user.click(screen.getByRole('button', { name: 'Ask' }))
}

describe('AssistantPage (F5)', () => {
  it('1. render inicial: formulario con label, textarea y botón deshabilitado', () => {
    render(<AssistantPage />)
    expect(screen.getByRole('heading', { name: 'Assistant' })).toBeInTheDocument()
    expect(screen.getByLabelText('Your question')).toBeInTheDocument()
    const ask = screen.getByRole('button', { name: 'Ask' })
    // Sin pregunta no se puede enviar (nunca se llama a la API en vacío).
    expect(ask).toBeDisabled()
    expect(screen.queryByText('Answer')).not.toBeInTheDocument()
  })

  it('2. envío de pregunta: fetch a POST /api/ask con la pregunta', async () => {
    fetchMock.mockResolvedValue(mockResponse(groundedAnswer()))
    render(<AssistantPage />)
    await submitQuestion('How do I use Button?')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/ask')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ question: 'How do I use Button?' })
  })

  it('3. loading: el botón queda disabled + aria-busy mientras la petición está en curso', async () => {
    let resolveFetch: (value: unknown) => void
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    render(<AssistantPage />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Your question'), 'How do I use Button?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    const ask = screen.getByRole('button', { name: 'Ask' })
    expect(ask).toBeDisabled()
    expect(ask).toHaveAttribute('aria-busy', 'true')
    // No hay respuesta todavía.
    expect(screen.queryByText('Answer')).not.toBeInTheDocument()
    resolveFetch!(mockResponse(groundedAnswer()))
    await waitFor(() => expect(screen.getByText('Answer')).toBeInTheDocument())
  })

  it('4. respuesta grounded: se muestra el texto de la respuesta', async () => {
    fetchMock.mockResolvedValue(mockResponse(groundedAnswer()))
    render(<AssistantPage />)
    await submitQuestion('How do I use Button?')
    await waitFor(() =>
      expect(
        screen.getByText('Use Button with variant="primary" and size="md".'),
      ).toBeInTheDocument(),
    )
  })

  it('5. Sources: se listan los componentes del retrieval con su score', async () => {
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
    render(<AssistantPage />)
    await submitQuestion('control de formulario')
    const sources = await screen.findByRole('list')
    await within(sources).findByText('input')
    expect(within(sources).getByText('select')).toBeInTheDocument()
    expect(within(sources).getByText('checkbox')).toBeInTheDocument()
    expect(within(sources).getByText('score 30')).toBeInTheDocument()
    expect(screen.getByText(/minScore threshold: 20/)).toBeInTheDocument()
  })

  it('6. confidence: high/medium/low se muestran con el estado de grounding correcto', async () => {
    const user = userEvent.setup()
    for (const [confidence, label] of [
      ['high', 'Grounded · high confidence'],
      ['medium', 'Grounded · medium confidence'],
      ['low', 'Grounded · low confidence'],
    ] as const) {
      fetchMock.mockResolvedValue(mockResponse(groundedAnswer({ confidence })))
      const { unmount } = render(<AssistantPage />)
      await user.type(screen.getByLabelText('Your question'), 'question')
      await user.click(screen.getByRole('button', { name: 'Ask' }))
      await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument())
      unmount()
    }
  })

  it('7. refusal: sin contexto → estado "No relevant context found", sin fuentes', async () => {
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
    render(<AssistantPage />)
    await submitQuestion('Necesito un DatePicker')
    await waitFor(() => expect(screen.getByText('No relevant context found')).toBeInTheDocument())
    expect(
      screen.getByText('No existe documentación relevante recuperada para esta consulta.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'No sources retrieved — the documentation had no relevant context for this question.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('8. error HTTP: se muestra un error amigable sin romper la página', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ error: { code: 'internal', message: 'Internal server error.' } }, 500),
    )
    render(<AssistantPage />)
    await submitQuestion('How do I use Button?')
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Algo salió mal en el servidor. Vuelve a intentarlo.',
      ),
    )
    // El texto del error interno del servidor nunca se muestra.
    expect(screen.queryByText('Internal server error.')).not.toBeInTheDocument()
    // El formulario sigue usable.
    expect(screen.getByRole('button', { name: 'Ask' })).toBeEnabled()
  })

  it('9. pregunta vacía: el botón permanece deshabilitado y la API nunca se llama', async () => {
    render(<AssistantPage />)
    const ask = screen.getByRole('button', { name: 'Ask' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Your question'), '   ')
    expect(ask).toBeDisabled()
    await user.clear(screen.getByLabelText('Your question'))
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
            query: 'how do i use button',
            components: [{ component: 'button', score: 100 }],
            minScore: 20,
          },
        }),
      ),
    )
    render(<AssistantPage />)
    await submitQuestion('How do I use Button?')
    const sources = await screen.findByRole('list')
    expect(within(sources).getByText('button')).toBeInTheDocument()
    expect(within(sources).queryByText('DatePicker')).toBeNull()
    expect(within(sources).queryByText('Card')).toBeNull()
  })

  it('11. accesibilidad básica: sin violaciones axe en estado inicial y tras respuesta', async () => {
    fetchMock.mockResolvedValue(mockResponse(groundedAnswer()))
    const { container } = render(<AssistantPage />)
    await expectNoAxeViolations(container)
    await submitQuestion('How do I use Button?')
    await waitFor(() => expect(screen.getByText('Answer')).toBeInTheDocument())
    await expectNoAxeViolations(container)
  })

  it('12. integración con la API mediante mock: pregunta → respuesta grounded → sources', async () => {
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
    render(<AssistantPage />)
    await submitQuestion('¿Qué componente sirve para seleccionar una opción?')
    await waitFor(() =>
      expect(screen.getByText('Usa Select para elegir una opción.')).toBeInTheDocument(),
    )
    expect(screen.getByText('Grounded · high confidence')).toBeInTheDocument()
    const sources = screen.getByRole('list')
    expect(within(sources).getByText('select')).toBeInTheDocument()
    expect(screen.getByText('model: mock-1')).toBeInTheDocument()
  })
})
