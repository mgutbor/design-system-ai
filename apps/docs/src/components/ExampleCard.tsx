import type { ComponentExample } from '@ods-ai/react'
import { CodeBlock } from './CodeBlock'
import styles from './ExampleCard.module.css'

/**
 * Renders one canonical example: live demo, description and the exact
 * canonical code (copy comes from the same object — no duplicated snippets).
 */
export function ExampleCard({ example }: { example: ComponentExample }) {
  return (
    <section className={styles.card} aria-labelledby={`example-${example.id}`}>
      <h3 id={`example-${example.id}`}>{example.title}</h3>
      {example.description ? <p className={styles.description}>{example.description}</p> : null}
      <div className={styles.demo}>{example.render()}</div>
      <CodeBlock code={example.code} />
    </section>
  )
}
