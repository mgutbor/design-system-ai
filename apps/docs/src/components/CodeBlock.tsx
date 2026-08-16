import { useState } from 'react'
import { Button } from '@ods-ai/react'
import styles from './CodeBlock.module.css'

/**
 * Code block with copy button. The `code` string always comes from a
 * canonical example (componentExamples) — never from duplicated snippets.
 */
export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // El portapapeles requiere contexto seguro; el fallback es seleccionar
      // el código manualmente.
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <span className={styles.language}>tsx</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={copy}
          aria-label={copied ? 'Código copiado' : 'Copiar código'}
        >
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <pre className={styles.pre}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
