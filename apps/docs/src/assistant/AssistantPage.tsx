import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Badge, Button, type BadgeVariant, type ComponentMetadata } from '@ods-ai/react'
import componentMetadata from '@ods-ai/react/metadata'
import { ask, type AskResponse } from './api'
import styles from './AssistantPage.module.css'

/**
 * Página del asistente (F5). Flujo: pregunta → POST /api/ask → AIAnswer → UI.
 *
 * Garantías de grounding de la UI:
 * - El panel de fuentes se construye EXCLUSIVAMENTE desde
 *   `answer.retrieval.components` (el set que pasó el gate en ai-core). El
 *   texto generado por el LLM nunca se usa como fuente: es imposible que la
 *   UI muestre un componente que no esté en el retrieval recibido.
 * - Los tres estados de grounding usan exactamente el contrato AIAnswer
 *   (`hasRelevantContext` + `confidence`), sin inventar un sistema nuevo.
 * - Refusal: `hasRelevantContext=false` → respuesta de "sin contexto" y sin
 *   fuentes; el provider no fue llamado (garantía de ai-core, no de la UI).
 *
 * Presentación (P1): las fuentes se muestran como documentación (enlaces a la
 * ficha del componente), nunca como detalles internos del algoritmo (score,
 * minScore, modelo). El texto y los errores están en español.
 */

type Status = 'idle' | 'loading' | 'success' | 'error'

const ERROR_LABELS: Record<string, string> = {
  network:
    'El asistente no está disponible en este momento. El servicio de IA necesita estar conectado.',
  rate_limit:
    'El servicio de IA está limitando las peticiones. Espera un momento e inténtalo de nuevo.',
  provider_timeout: 'El servicio de IA tardó demasiado en responder. Inténtalo de nuevo.',
  provider_unavailable: 'El servicio de IA no está disponible ahora mismo. Inténtalo más tarde.',
  invalid_request: 'La pregunta fue rechazada. Reformúlala e inténtalo de nuevo.',
  internal: 'Algo salió mal en el servidor. Vuelve a intentarlo.',
}

function groundingStatus(answer: AskResponse): { label: string; variant: BadgeVariant } {
  if (!answer.hasRelevantContext) {
    return { label: 'Sin contexto relevante', variant: 'neutral' }
  }
  if (answer.confidence === 'high') {
    return { label: 'Con contexto · confianza alta', variant: 'success' }
  }
  if (answer.confidence === 'medium') {
    return { label: 'Con contexto · confianza media', variant: 'success' }
  }
  return { label: 'Con contexto · confianza baja', variant: 'warning' }
}

/** Nombre de un componente desde la metadata pública (fallback: slug). */
function componentName(slug: string): string {
  return (
    (componentMetadata as ComponentMetadata[]).find((entry) => entry.component === slug)?.name ??
    slug
  )
}

const EXAMPLE_QUESTIONS = [
  '¿Cómo uso Button?',
  '¿Qué componente debo usar para seleccionar una opción?',
  '¿Cómo funciona FormField con un error?',
] as const

export default function AssistantPage() {
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [answer, setAnswer] = useState<AskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = question.trim() !== '' && status !== 'loading'

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const trimmed = question.trim()
    if (trimmed === '' || status === 'loading') return

    setStatus('loading')
    setError(null)
    try {
      const response = await ask(trimmed)
      setAnswer(response)
      setStatus('success')
    } catch (caught) {
      const code =
        caught instanceof Error && 'code' in caught ? (caught as { code: string }).code : 'internal'
      setError(
        ERROR_LABELS[code] ?? ERROR_LABELS.internal ?? 'Algo salió mal. Vuelve a intentarlo.',
      )
      setAnswer(null)
      setStatus('error')
    }
  }

  const grounding = answer !== null ? groundingStatus(answer) : null
  const sources = answer?.retrieval.components ?? []

  return (
    <div className={styles.page}>
      <section aria-labelledby="assistant-heading">
        <h1 id="assistant-heading">Asistente</h1>
        <p className={styles.lead}>
          Pregunta cómo usar el sistema de diseño. Las respuestas se basan exclusivamente en la
          documentación recuperada: el asistente nunca inventa componentes, props, tokens ni
          ejemplos.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label htmlFor="assistant-question">Tu pregunta</label>
            <textarea
              id="assistant-question"
              rows={4}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="p. ej. ¿Cómo uso Button?"
              aria-describedby="assistant-hint"
            />
            <p id="assistant-hint" className={styles.hint}>
              Prueba:{' '}
              {EXAMPLE_QUESTIONS.map((example) => (
                <button
                  key={example}
                  type="button"
                  className={styles.exampleChip}
                  onClick={() => setQuestion(example)}
                >
                  {example}
                </button>
              ))}
            </p>
          </div>
          <div className={styles.actions}>
            <Button type="submit" loading={status === 'loading'} disabled={!canSubmit}>
              Preguntar
            </Button>
          </div>
        </form>
      </section>

      {error !== null ? (
        <section
          aria-live="polite"
          aria-label="Error del asistente"
          className={styles.error}
          role="alert"
        >
          {error}
        </section>
      ) : null}

      {answer !== null ? (
        <section aria-labelledby="answer-heading" aria-live="polite" className={styles.result}>
          <h2 id="answer-heading">Respuesta</h2>
          {grounding !== null ? (
            <p className={styles.status}>
              <Badge variant={grounding.variant}>{grounding.label}</Badge>
            </p>
          ) : null}
          <div className={styles.answerText}>{answer.answer}</div>

          <h3>Fuentes de documentación</h3>
          {sources.length === 0 ? (
            <p className={styles.noSources}>
              No se recuperó documentación relevante para esta pregunta.
            </p>
          ) : (
            <ul className={styles.sources}>
              {sources.map((source) => (
                <li key={source.component}>
                  <Link to={`/components/${source.component}`}>
                    {componentName(source.component)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
