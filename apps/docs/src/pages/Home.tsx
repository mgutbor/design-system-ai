import { Badge, Button } from '@ods-ai/react'
import { Link, useNavigate } from 'react-router'
import styles from './Home.module.css'

const COMPONENT_LINKS = [
  ['button', 'Button'],
  ['input', 'Input'],
  ['form-field', 'FormField'],
  ['checkbox', 'Checkbox'],
  ['select', 'Select'],
  ['modal', 'Modal'],
  ['badge', 'Badge'],
  ['spinner', 'Spinner'],
] as const

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className={styles.home}>
      <section>
        <Badge>Código abierto</Badge>
        <h1>Open Design System AI</h1>
        <p className={styles.lead}>
          Un sistema de diseño basado en design tokens para aplicaciones React accesibles — con
          documentación, ejemplos canónicos y un asistente de IA que responde solo con su propia
          documentación.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => navigate('/getting-started')}>Empezar</Button>
          <Button variant="secondary" onClick={() => navigate('/components')}>
            Explorar componentes
          </Button>
        </div>
      </section>

      <section aria-labelledby="components-heading">
        <h2 id="components-heading">Componentes</h2>
        <ul className={styles.grid}>
          {COMPONENT_LINKS.map(([slug, name]) => (
            <li key={slug}>
              <Link className={styles.card} to={`/components/${slug}`}>
                <span className={styles.cardTitle}>{name}</span>
                <span className={styles.cardSlug}>{slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="principles-heading">
        <h2 id="principles-heading">Principios</h2>
        <ul className={styles.principles}>
          <li>Accesible desde el inicio — WCAG 2.2 AA.</li>
          <li>APIs públicas pequeñas y explícitas.</li>
          <li>Design tokens como única fuente de verdad visual.</li>
          <li>Ejemplos canónicos como única fuente de código de ejemplo.</li>
          <li>Documentación con grounding — sin APIs inventadas.</li>
        </ul>
      </section>
    </div>
  )
}
