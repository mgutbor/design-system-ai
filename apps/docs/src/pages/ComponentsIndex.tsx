import componentMetadata from '@ods-ai/react/metadata'
import type { ComponentMetadata } from '@ods-ai/react'
import { Link } from 'react-router'
import styles from './ComponentsIndex.module.css'

const metadata = componentMetadata as ComponentMetadata[]

export default function ComponentsIndex() {
  return (
    <div>
      <h1>Components</h1>
      <p>
        Every component ships with canonical examples, API documentation and accessibility notes.
      </p>
      <ul className={styles.list}>
        {metadata.map((entry) => (
          <li key={entry.id}>
            <Link to={`/components/${entry.component}`} className={styles.item}>
              <span className={styles.name}>{entry.name}</span>
              <span className={styles.description}>{entry.description}</span>
              <span className={styles.meta}>
                {entry.variants.length > 0 ? `${entry.variants.join(', ')} · ` : ''}
                {entry.examples.length} examples
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
