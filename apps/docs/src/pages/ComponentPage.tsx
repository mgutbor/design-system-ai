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
        <h1>Component not found</h1>
        <p>
          <Link to="/components">Back to components</Link>
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
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link to="/components">Components</Link>
        <span aria-hidden="true"> / </span>
        <span>{entry.name}</span>
      </nav>

      <h1>{entry.name}</h1>
      <p className={styles.description}>{entry.description}</p>
      <p className={styles.url}>
        <code>/components/{entry.component}</code>
      </p>

      <section aria-labelledby="api-heading">
        <h2 id="api-heading">API</h2>
        <PropTable props={ownProps} />
        {inheritedProps.length > 0 ? (
          <details className={styles.inherited}>
            <summary>
              HTML attributes &amp; ARIA (inherited) — {inheritedProps.length} props
            </summary>
            <PropTable props={inheritedProps} />
          </details>
        ) : null}
      </section>

      {entry.variants.length > 0 ? (
        <section aria-labelledby="variants-heading">
          <h2 id="variants-heading">Variants</h2>
          <p>{entry.variants.join(' · ')}</p>
        </section>
      ) : null}

      <section aria-labelledby="examples-heading">
        <h2 id="examples-heading">Examples</h2>
        <p className={styles.sourceNote}>
          Canonical examples — single source of truth:{' '}
          <code>{entry.sourcePath.replace(/\.tsx$/, '.examples.tsx')}</code>
        </p>
        <div className={styles.examples}>
          {examples.map((example) => (
            <ExampleCard key={example.id} example={example} />
          ))}
        </div>
      </section>

      <section aria-labelledby="accessibility-heading">
        <h2 id="accessibility-heading">Accessibility</h2>
        <p>{entry.a11ySummary}</p>
      </section>

      <section aria-labelledby="tokens-heading">
        <h2 id="tokens-heading">Tokens used</h2>
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
