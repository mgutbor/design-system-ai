import { Badge, Button, type ComponentMetadata } from '@ods-ai/react'
import componentMetadata from '@ods-ai/react/metadata'
import { Link, useNavigate } from 'react-router'
import styles from './Home.module.css'

const metadata = componentMetadata as ComponentMetadata[]

export default function Home() {
  const navigate = useNavigate()
  // V1-0 (P2-1): la lista se deriva de la metadata generada — la misma fuente
  // que /components. Sin arrays hardcodeados: es imposible que Home se quede
  // sin un componente al crecer el DS (test de no-drift en Home.test.tsx).
  const components = [...metadata].sort((a, b) => a.name.localeCompare(b.name))

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
          {components.map((entry) => (
            <li key={entry.component}>
              <Link className={styles.card} to={entry.url}>
                <span className={styles.cardTitle}>{entry.name}</span>
                {/* El slug es redundante para lectores de pantalla (Badge/badge);
                    se mantiene visible para copiar la ruta, pero fuera del nombre
                    accesible del enlace. */}
                <span className={styles.cardSlug} aria-hidden="true">
                  {entry.component}
                </span>
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
