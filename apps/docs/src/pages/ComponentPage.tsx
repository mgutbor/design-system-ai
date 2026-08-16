import { componentExamples, type ComponentMetadata } from '@ods-ai/react'
import componentMetadata from '@ods-ai/react/metadata'
import { Link, useParams } from 'react-router'
import { ownPropsFor } from '../data/own-props.generated'
import { ExampleCard } from '../components/ExampleCard'
import { PropTable } from '../components/PropTable'
import styles from './ComponentPage.module.css'

const metadata = componentMetadata as ComponentMetadata[]

export default function ComponentPage() {
  const { slug } = useParams<{ slug: string }>()
  const entry = metadata.find((item) => item.component === slug)
  const examples = slug !== undefined ? componentExamples[slug] : undefined

  if (!entry || !examples) {
    return (
      <div>
        <h1>Componente no encontrado</h1>
        <p>
          <Link to="/components">Volver a componentes</Link>
        </p>
      </div>
    )
  }

  // API pública: solo las props propias de ODS AI (artefacto generado desde
  // OWN_PROPS_BY_COMPONENT). Las props HTML/ARIA heredadas no se ocultan:
  // viven en una sección secundaria colapsable para no dominar la ficha.
  const own = new Set(ownPropsFor(entry.component))
  const ownProps = entry.props.filter((prop) => own.has(prop.name))
  const inheritedProps = entry.props.filter((prop) => !own.has(prop.name))

  return (
    <div className={styles.page}>
      <nav aria-label="Miga de pan" className={styles.breadcrumb}>
        <Link to="/components">Componentes</Link>
        <span aria-hidden="true"> / </span>
        <span>{entry.name}</span>
      </nav>

      <h1>{entry.name}</h1>
      <p className={styles.description}>{entry.description}</p>
      <p className={styles.url}>
        <code>/components/{entry.component}</code>
      </p>

      {entry.whenToUse !== undefined && entry.whenToUse.length > 0 ? (
        <section aria-labelledby="when-to-use-heading">
          <h2 id="when-to-use-heading">Cuándo usar</h2>
          <ul className={styles.whenList}>
            {entry.whenToUse.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {entry.whenNotToUse !== undefined && entry.whenNotToUse.length > 0 ? (
        <section aria-labelledby="when-not-to-use-heading">
          <h2 id="when-not-to-use-heading">Cuándo NO usar</h2>
          <ul className={styles.whenList}>
            {entry.whenNotToUse.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {entry.variants.length > 0 ? (
        <section aria-labelledby="variants-heading">
          <h2 id="variants-heading">Variantes</h2>
          <p>{entry.variants.join(' · ')}</p>
        </section>
      ) : null}

      {entry.behavior !== undefined ? (
        <section aria-labelledby="behavior-heading">
          <h2 id="behavior-heading">Comportamiento</h2>
          <p>{entry.behavior}</p>
        </section>
      ) : null}

      <section aria-labelledby="examples-heading">
        <h2 id="examples-heading">Ejemplos</h2>
        <p className={styles.sourceNote}>
          Los ejemplos son canónicos: el código que copias es exactamente el que se muestra.
        </p>
        <div className={styles.examples}>
          {examples.map((example) => (
            <ExampleCard key={example.id} example={example} />
          ))}
        </div>
      </section>

      <section aria-labelledby="api-heading">
        <h2 id="api-heading">API</h2>
        <PropTable props={ownProps} />
        {inheritedProps.length > 0 ? (
          <details className={styles.inherited}>
            <summary>Atributos HTML y ARIA (heredados) — {inheritedProps.length} props</summary>
            <PropTable props={inheritedProps} />
          </details>
        ) : null}
      </section>

      <section aria-labelledby="accessibility-heading">
        <h2 id="accessibility-heading">Accesibilidad</h2>
        <p>{entry.a11ySummary}</p>
      </section>

      <section aria-labelledby="tokens-heading">
        <h2 id="tokens-heading">Tokens utilizados</h2>
        <ul className={styles.tokens}>
          {entry.tokensUsed.map((token) => (
            <li key={token}>
              <Link to="/foundations/tokens">
                <code>{token}</code>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
