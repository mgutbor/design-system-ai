import { useState, type FormEvent } from 'react'
import { Badge, Button, type BadgeVariant } from '@ods-ai/react'
import { ask, type AskResponse } from './api'
import styles from './AssistantPage.module.css'

/**
 * Página del asistente (F5). Flujo: pregunta → POST /api/ask → AIAnswer → UI.
 *
 * Garantías de grounding de la UI:
 * - El panel Sources se construye EXCLUSIVAMENTE desde
 *   `answer.retrieval.components` (el set que pasó el gate en ai-core). El
 *   texto generado por el LLM nunca se usa como fuente: es imposible que la
 *   UI muestre un componente que no esté en el retrieval recibido.
 * - Los tres estados de grounding usan exactamente el contrato AIAnswer
 *   (`hasRelevantContext` + `confidence`), sin inventar un sistema nuevo.
 * - Refusal: `hasRelevantContext=false` → respuesta de "sin contexto" y sin
 *   fuentes; el provider no fue llamado (garantía de ai-core, no de la UI).
 */

type Status = 'idle' | 'loading' | 'success' | 'error'

const ERROR_LABELS: Record<string, string> = {
  network:
    'No se pudo contactar con la API del asistente. Comprueba que está en marcha e inténtalo de nuevo.',
  rate_limit:
    'El proveedor de IA está limitando peticiones. Espera un momento y vuelve a intentarlo.',
  provider_timeout: 'El proveedor de IA tardó demasiado en responder. Vuelve a intentarlo.',
  provider_unavailable: 'El proveedor de IA no está disponible ahora mismo. Inténtalo más tarde.',
  invalid_request: 'La pregunta fue rechazada. Reformúlala e inténtalo de nuevo.',
  internal: 'Algo salió mal en el servidor. Vuelve a intentarlo.',
}

function groundingStatus(answer: AskResponse): { label: string; variant: BadgeVariant } {
  if (!answer.hasRelevantContext) {
    return { label: 'No relevant context found', variant: 'neutral' }
  }
  if (answer.confidence === 'high') {
    return { label: 'Grounded · high confidence', variant: 'success' }
  }
  if (answer.confidence === 'medium') {
    return { label: 'Grounded · medium confidence', variant: 'success' }
  }
  return { label: 'Grounded · low confidence', variant: 'warning' }
}

const EXAMPLE_QUESTIONS = [
  'How do I use Button?',
  'What component should I use to select an option?',
  'How does FormField behave with an error?',
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
        <h1 id="assistant-heading">Assistant</h1>
        <p className={styles.lead}>
          Ask how to use the design system. Answers are grounded exclusively in the retrieved
          documentation — the assistant never invents components, props, tokens or examples.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label htmlFor="assistant-question">Your question</label>
            <textarea
              id="assistant-question"
              rows={4}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. How do I use Button?"
              aria-describedby="assistant-hint"
            />
            <p id="assistant-hint" className={styles.hint}>
              Try:{' '}
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
              Ask
            </Button>
          </div>
        </form>
      </section>

      {error !== null ? (
        <section
          aria-live="polite"
          aria-label="Assistant error"
          className={styles.error}
          role="alert"
        >
          {error}
        </section>
      ) : null}

      {answer !== null ? (
        <section aria-labelledby="answer-heading" aria-live="polite" className={styles.result}>
          <h2 id="answer-heading">Answer</h2>
          {grounding !== null ? (
            <p className={styles.status}>
              <Badge variant={grounding.variant}>{grounding.label}</Badge>
              {answer.model !== '' ? (
                <span className={styles.model}>model: {answer.model}</span>
              ) : null}
            </p>
          ) : null}
          <div className={styles.answerText}>{answer.answer}</div>

          <h3>Sources</h3>
          {sources.length === 0 ? (
            <p className={styles.noSources}>
              No sources retrieved — the documentation had no relevant context for this question.
            </p>
          ) : (
            <>
              <ul className={styles.sources}>
                {sources.map((source) => (
                  <li key={source.component}>
                    <code>{source.component}</code>
                    <span className={styles.score}>score {source.score}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.minScore}>minScore threshold: {answer.retrieval.minScore}</p>
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
