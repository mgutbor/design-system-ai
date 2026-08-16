import { useLayoutEffect, useRef, useState } from 'react'
import { tokens } from '@ods-ai/tokens'
import styles from './Tokens.module.css'

type TokenEntry = { path: string; value: string }

const PRIMITIVE_COLOR_FAMILIES = ['blue', 'gray', 'green', 'amber', 'red', 'white', 'black']

function flatten(node: Record<string, unknown>, prefix: string): TokenEntry[] {
  const entries: TokenEntry[] = []
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') entries.push({ path, value })
    else entries.push(...flatten(value as Record<string, unknown>, path))
  }
  return entries
}

function varName(path: string): string {
  return `--${path.replaceAll('.', '-')}`
}

function groupByCategory(entries: TokenEntry[]): Record<string, TokenEntry[]> {
  return entries.reduce<Record<string, TokenEntry[]>>((groups, entry) => {
    const category = entry.path.split('.')[0] ?? 'other'
    ;(groups[category] ??= []).push(entry)
    return groups
  }, {})
}

const allEntries = flatten(tokens as unknown as Record<string, unknown>, '')
const colorEntries = allEntries.filter((entry) => entry.path.startsWith('color.'))
const primitives = colorEntries.filter((entry) => {
  const family = entry.path.split('.')[1]
  return family !== undefined && PRIMITIVE_COLOR_FAMILIES.includes(family)
})
const semanticEntries = colorEntries.filter(
  (entry) => !PRIMITIVE_COLOR_FAMILIES.includes(entry.path.split('.')[1] ?? ''),
)
const primitiveGroups = groupByCategory(primitives)
const semanticGroups = groupByCategory(semanticEntries)

export default function Tokens() {
  const probeRef = useRef<HTMLSpanElement>(null)
  const [darkValues, setDarkValues] = useState<Record<string, string>>({})

  // Lee en vivo los valores del tema oscuro desde las CSS custom properties
  // (probe con data-theme="dark") — sin duplicar el sistema de theming.
  useLayoutEffect(() => {
    const span = probeRef.current
    if (!span) return
    const values: Record<string, string> = {}
    for (const entry of semanticEntries) {
      values[entry.path] = getComputedStyle(span).getPropertyValue(varName(entry.path)).trim()
    }
    setDarkValues(values)
  }, [])

  return (
    <div className={styles.tokens}>
      <div data-theme="dark" aria-hidden="true" className={styles.probe}>
        <span ref={probeRef} />
      </div>

      <section aria-labelledby="semantic-heading">
        <h1 id="semantic-heading">Tokens semánticos</h1>
        <p>
          Los tokens semánticos expresan intención (acciones, estados, texto, superficies). Se
          resuelven a tokens primitivos y se adaptan automáticamente al tema activo.
        </p>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Claro</th>
                <th scope="col">Oscuro</th>
                <th scope="col">Variable CSS</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(semanticGroups).flatMap(([category, entries]) => [
                <tr key={`${category}-header`} className={styles.categoryRow}>
                  <th scope="rowgroup" colSpan={4}>
                    color.{category}
                  </th>
                </tr>,
                ...entries.map((entry) => (
                  <tr key={entry.path}>
                    <th scope="row" className={styles.mono}>
                      {entry.path}
                    </th>
                    <td>
                      <Swatch value={entry.value} />
                    </td>
                    <td>
                      {darkValues[entry.path] ? <Swatch value={darkValues[entry.path]!} /> : '—'}
                    </td>
                    <td className={styles.mono}>{varName(entry.path)}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="primitive-heading">
        <h2 id="primitive-heading">Tokens primitivos</h2>
        <p>
          La paleta y las escalas base. Los componentes nunca los referencian directamente — lo
          hacen los tokens semánticos.
        </p>
        {Object.entries(primitiveGroups).map(([category, entries]) => (
          <div key={category} className={styles.category}>
            <h3>{category}</h3>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.path}>
                      <th scope="row" className={styles.mono}>
                        {entry.path}
                      </th>
                      <td>{isColor(entry) ? <Swatch value={entry.value} /> : entry.value}</td>
                      <td className={styles.mono}>{varName(entry.path)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function isColor(entry: TokenEntry): boolean {
  return /^#[0-9a-f]{6}$/i.test(entry.value)
}

function Swatch({ value }: { value: string }) {
  return (
    <span className={styles.swatch}>
      <span className={styles.swatchColor} style={{ backgroundColor: value }} />
      {value}
    </span>
  )
}
