import type { ComponentPropMetadata } from '@ods-ai/react'
import styles from './PropTable.module.css'

export function PropTable({ props }: { props: ComponentPropMetadata[] }) {
  if (props.length === 0) return null
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Prop</th>
            <th scope="col">Tipo</th>
            <th scope="col">Default</th>
            <th scope="col">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name}>
              <th scope="row" className={styles.mono}>
                {prop.name}
                {prop.required ? <span className={styles.required}> *</span> : null}
              </th>
              <td className={styles.mono}>{prop.type}</td>
              <td className={styles.mono}>{prop.defaultValue ?? '—'}</td>
              <td>{prop.description ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
