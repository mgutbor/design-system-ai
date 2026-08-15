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
        <Badge>Open source</Badge>
        <h1>Open Design System AI</h1>
        <p className={styles.lead}>
          A token-driven design system for accessible React applications — with documentation,
          canonical examples and a future AI assistant grounded in its own documentation.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => navigate('/components')}>Browse components</Button>
          <Button variant="secondary" onClick={() => navigate('/foundations/tokens')}>
            Explore tokens
          </Button>
        </div>
      </section>

      <section aria-labelledby="components-heading">
        <h2 id="components-heading">Components</h2>
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
        <h2 id="principles-heading">Principles</h2>
        <ul className={styles.principles}>
          <li>Accessible from the start — WCAG 2.2 AA.</li>
          <li>Small, explicit public APIs.</li>
          <li>Design tokens as the single source of visual truth.</li>
          <li>Canonical examples as the only source of example code.</li>
          <li>Grounded documentation — no invented APIs.</li>
        </ul>
      </section>
    </div>
  )
}
