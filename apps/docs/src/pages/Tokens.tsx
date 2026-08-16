import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Button } from '@ods-ai/react'
import { tokens } from '@ods-ai/tokens'
import { CodeBlock } from '../components/CodeBlock'
import { CONTRAST_PAIRS, SEMANTIC_REFS, type ContrastPair } from '../data/tokens-data.generated'
import { contrastRatio } from '../utils/contrast'
import styles from './Tokens.module.css'

type TokenEntry = { path: string; value: string }

const CSS_USAGE = `.button {
  color: var(--color-text-default);
  background: var(--color-action-primary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}`

const TS_USAGE = `import { getToken, tokens } from '@ods-ai/tokens'

const primary = getToken('color.action.primary') // '#2563eb'
const spacing = tokens.space[4] // '1rem'`

const THEME_USAGE = `<html data-theme="dark">`

function flatten(node: Record<string, unknown>, prefix = ''): TokenEntry[] {
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

function cssVar(path: string): string {
  return `var(${varName(path)})`
}

function lookup(node: Record<string, unknown>, path: string): string | undefined {
  let current: Record<string, unknown> | string | undefined = node
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined
    current = current[segment] as Record<string, unknown> | string | undefined
  }
  return typeof current === 'string' ? current : undefined
}

function groupBy<T>(entries: T[], key: (entry: T) => string): Record<string, T[]> {
  return entries.reduce<Record<string, T[]>>((groups, entry) => {
    const group = key(entry)
    ;(groups[group] ??= []).push(entry)
    return groups
  }, {})
}

/** Derivación de categorías exclusivamente desde los datos reales (sin listas hardcodeadas). */
const allEntries = flatten(tokens as unknown as Record<string, unknown>, '')
const semanticPaths = new Set(Object.keys(SEMANTIC_REFS))
const semanticEntries = allEntries.filter((entry) => semanticPaths.has(entry.path))
const primitiveEntries = allEntries.filter((entry) => !semanticPaths.has(entry.path))

const primitiveColorEntries = primitiveEntries.filter((entry) => entry.path.startsWith('color.'))
const fontEntries = primitiveEntries.filter((entry) => entry.path.startsWith('font.'))
const spaceEntries = primitiveEntries.filter((entry) => entry.path.startsWith('space.'))
const radiusEntries = primitiveEntries.filter((entry) => entry.path.startsWith('radius.'))
const motionEntries = primitiveEntries.filter((entry) => entry.path.startsWith('motion.'))
const zindexEntries = primitiveEntries.filter((entry) => entry.path.startsWith('zindex.'))

const colorPrimitiveGroups = groupBy(
  primitiveColorEntries,
  (entry) => entry.path.split('.')[1] ?? '',
)
const semanticGroups = groupBy(semanticEntries, (entry) => entry.path.split('.')[1] ?? '')
const fontGroups = groupBy(fontEntries, (entry) => entry.path.split('.')[1] ?? '')
const motionGroups = groupBy(motionEntries, (entry) => entry.path.split('.')[1] ?? '')

const contrastPairs = Object.entries(CONTRAST_PAIRS).map(([id, pair]) => ({ id, ...pair }))

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
      // Solo se guardan valores reales: sin CSS (p. ej. jsdom) el mapa queda
      // vacío y la UI degrada a «—» en vez de mostrar falsos ratios.
      const value = getComputedStyle(span).getPropertyValue(varName(entry.path)).trim()
      if (value) values[entry.path] = value
    }
    setDarkValues(values)
  }, [])

  return (
    <div className={styles.tokens}>
      <div data-theme="dark" aria-hidden="true" className={styles.probe}>
        <span ref={probeRef} />
      </div>

      <section aria-labelledby="tokens-intro">
        <h1 id="tokens-intro">Tokens de diseño</h1>
        <p>
          Los design tokens son las decisiones de diseño más pequeñas y reutilizables del sistema:
          color, tipografía, espacio, radio, movimiento y z-index. Se definen como JSON en{' '}
          <code>packages/tokens/src/tokens/</code> y se compilan en tres artefactos mediante{' '}
          <code>pnpm generate</code>: CSS custom properties (<code>tokens.css</code>), un objeto
          TypeScript tipado (<code>tokens</code>) y los tipos <code>TokenPath</code>.
        </p>
        <p>
          Existen tres capas: <strong>primitivos</strong> (valores base),{' '}
          <strong>semánticos</strong> (expresan intención y referencian primitivos) y{' '}
          <strong>component</strong> (vacía por diseño; un token de componente solo nace si aporta
          semántica que los semánticos no expresan).
        </p>
        <p>
          Los <strong>temas</strong> se resuelven por CSS: <code>light</code> está vacío (los
          semánticos definen los valores por defecto) y <code>dark</code> sobrescribe 18 tokens
          semánticos mediante <code>[data-theme="dark"]</code>.
        </p>
        <p>
          Los componentes de <code>@ods-ai/react</code> consumen tokens semánticos para las
          decisiones de tema (color, superficie, texto, foco, borde) y las escalas primitivas de
          tipografía, espacio, radio y movimiento. La auditoría de uso del validador detecta
          cualquier referencia no tokenizada en el código.
        </p>
      </section>

      <section aria-labelledby="usage-heading">
        <h2 id="usage-heading">Cómo usar los tokens</h2>
        <p>En CSS, mediante las custom properties generadas:</p>
        <CodeBlock code={CSS_USAGE} language="css" />
        <p>
          En TypeScript/React, con el objeto tipado <code>tokens</code> y <code>getToken</code>{' '}
          (valores light resueltos, fail-fast en runtime):
        </p>
        <CodeBlock code={TS_USAGE} language="ts" />
        <p>
          El tema oscuro se activa con el atributo <code>data-theme</code> en el elemento raíz. Los
          valores dark solo existen como CSS custom properties (no forman parte del objeto JS):
        </p>
        <CodeBlock code={THEME_USAGE} language="html" />
      </section>

      <section aria-labelledby="color-heading">
        <h2 id="color-heading">Color</h2>

        <h3 id="color-primitives">Primitivos</h3>
        <p>La paleta base, organizada por familias. Los semánticos referencian estos valores.</p>
        {Object.keys(colorPrimitiveGroups)
          .sort()
          .map((family) => (
            <TokenTable
              key={family}
              title={family}
              columns={['Token', 'Color', 'Variable CSS', 'Copiar']}
              rows={colorPrimitiveGroups[family]!.map((entry) => ({
                key: entry.path,
                label: entry.path.split('.').slice(1).join('.'),
                cells: [
                  <Swatch key="swatch" value={entry.value} />,
                  <code key="var" className={styles.mono}>
                    {varName(entry.path)}
                  </code>,
                  <CopyVarButton key="copy" varName={varName(entry.path)} />,
                ],
              }))}
            />
          ))}

        <h3 id="color-semantic">Semánticos</h3>
        <p>
          18 tokens que expresan intención (acciones, estados, texto, superficies, foco, borde).
          Cada uno referencia un primitivo (columna «Resuelve a») y cambia de valor según el tema.
        </p>
        {Object.keys(semanticGroups)
          .sort()
          .map((group) => (
            <TokenTable
              key={group}
              title={`color.${group}`}
              columns={['Token', 'Claro', 'Oscuro', 'Resuelve a', 'Variable CSS', 'Copiar']}
              rows={semanticGroups[group]!.map((entry) => ({
                key: entry.path,
                label: entry.path,
                cells: [
                  <Swatch key="light" value={entry.value} />,
                  darkValues[entry.path] ? (
                    <Swatch key="dark" value={darkValues[entry.path]!} />
                  ) : (
                    '—'
                  ),
                  <code key="ref" className={styles.mono}>
                    {SEMANTIC_REFS[entry.path]}
                  </code>,
                  <code key="var" className={styles.mono}>
                    {varName(entry.path)}
                  </code>,
                  <CopyVarButton key="copy" varName={varName(entry.path)} />,
                ],
              }))}
            />
          ))}
      </section>

      <section aria-labelledby="typography-heading">
        <h2 id="typography-heading">Tipografía</h2>
        <p>Escala tipográfica completa: familias, tamaños, pesos y alturas de línea.</p>
        {(['family', 'size', 'weight', 'leading'] as const).map((group) => (
          <TokenTable
            key={group}
            title={`font.${group}`}
            columns={['Token', 'Ejemplo', 'Valor', 'Variable CSS', 'Copiar']}
            rows={(fontGroups[group] ?? []).map((entry) => ({
              key: entry.path,
              label: entry.path.split('.').slice(2).join('.'),
              cells: [
                <TypographyPreview key="preview" entry={entry} />,
                <span key="value" className={styles.value}>
                  {entry.value}
                </span>,
                <code key="var" className={styles.mono}>
                  {varName(entry.path)}
                </code>,
                <CopyVarButton key="copy" varName={varName(entry.path)} />,
              ],
            }))}
          />
        ))}
      </section>

      <section aria-labelledby="space-heading">
        <h2 id="space-heading">Espacio</h2>
        <p>Escala de espaciado de 0 a 6rem.</p>
        <TokenTable
          title="space"
          columns={['Token', 'Preview', 'Valor', 'Variable CSS', 'Copiar']}
          rows={spaceEntries.map((entry) => ({
            key: entry.path,
            label: entry.path,
            cells: [
              entry.value === '0' ? (
                '—'
              ) : (
                <span
                  key="preview"
                  className={styles.spaceBar}
                  style={{ width: cssVar(entry.path) }}
                />
              ),
              <span key="value" className={styles.value}>
                {entry.value}
              </span>,
              <code key="var" className={styles.mono}>
                {varName(entry.path)}
              </code>,
              <CopyVarButton key="copy" varName={varName(entry.path)} />,
            ],
          }))}
        />
      </section>

      <section aria-labelledby="radius-heading">
        <h2 id="radius-heading">Radio</h2>
        <p>Radio de esquina, de 0 (sin redondeo) a 9999px (completamente redondeado).</p>
        <TokenTable
          title="radius"
          columns={['Token', 'Preview', 'Valor', 'Variable CSS', 'Copiar']}
          rows={radiusEntries.map((entry) => ({
            key: entry.path,
            label: entry.path,
            cells: [
              <span
                key="preview"
                className={styles.radiusSample}
                style={{ borderRadius: cssVar(entry.path) }}
              />,
              <span key="value" className={styles.value}>
                {entry.value}
              </span>,
              <code key="var" className={styles.mono}>
                {varName(entry.path)}
              </code>,
              <CopyVarButton key="copy" varName={varName(entry.path)} />,
            ],
          }))}
        />
      </section>

      <section aria-labelledby="motion-heading">
        <h2 id="motion-heading">Movimiento</h2>
        <p>
          Duraciones y easings usados por las animaciones de los componentes (p. ej. las
          transiciones de Button, Input y Select).
        </p>
        <div className={styles.motionDemo} aria-hidden="true">
          <span className={styles.motionDemoBox} />
        </div>
        <p className={styles.demoNote}>
          Demo: <code>{cssVar('motion.duration.base')}</code> +{' '}
          <code>{cssVar('motion.easing.standard')}</code>, desactivada con{' '}
          <code>prefers-reduced-motion</code>.
        </p>
        {Object.keys(motionGroups)
          .sort()
          .map((group) => (
            <TokenTable
              key={group}
              title={`motion.${group}`}
              columns={['Token', 'Valor', 'Variable CSS', 'Copiar']}
              rows={motionGroups[group]!.map((entry) => ({
                key: entry.path,
                label: entry.path.split('.').slice(2).join('.'),
                cells: [
                  <span key="value" className={styles.value}>
                    {entry.value}
                  </span>,
                  <code key="var" className={styles.mono}>
                    {varName(entry.path)}
                  </code>,
                  <CopyVarButton key="copy" varName={varName(entry.path)} />,
                ],
              }))}
            />
          ))}
      </section>

      <section aria-labelledby="zindex-heading">
        <h2 id="zindex-heading">Z-index</h2>
        <p>
          Escala de apilamiento. Usos verificados en el repositorio: <code>sticky</code> (header de
          apps/docs y apps/playground) y <code>toast</code> (skip-link). El resto forma parte de la
          escala definida.
        </p>
        <TokenTable
          title="zindex"
          columns={['Token', 'Valor', 'Variable CSS', 'Copiar']}
          rows={zindexEntries.map((entry) => ({
            key: entry.path,
            label: entry.path,
            cells: [
              <span key="value" className={styles.value}>
                {entry.value}
              </span>,
              <code key="var" className={styles.mono}>
                {varName(entry.path)}
              </code>,
              <CopyVarButton key="copy" varName={varName(entry.path)} />,
            ],
          }))}
        />
      </section>

      <section aria-labelledby="contrast-heading">
        <h2 id="contrast-heading">Contraste y accesibilidad</h2>
        <p>
          Los {contrastPairs.length} pares definidos en <code>contrast.json</code>. El ratio se
          computa (dato derivado) con la fórmula WCAG — la misma que usa el validador de{' '}
          <code>@ods-ai/tokens</code> — a partir de los valores reales: en claro desde el objeto{' '}
          <code>tokens</code> y en oscuro desde las CSS custom properties del tema. Criterios:{' '}
          <strong>4.5:1</strong> para texto normal y <strong>3:1</strong> para texto grande y
          componentes UI (AA).
        </p>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Par</th>
                <th scope="col">Foreground</th>
                <th scope="col">Background</th>
                <th scope="col">Ratio claro</th>
                <th scope="col">Ratio oscuro</th>
                <th scope="col">Criterio</th>
              </tr>
            </thead>
            <tbody>
              {contrastPairs.map((pair) => (
                <ContrastRow key={pair.id} pair={pair} darkValues={darkValues} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function TokenTable({
  title,
  columns,
  rows,
}: {
  title: string
  columns: string[]
  rows: { key: string; label: string; cells: ReactNode[] }[]
}) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.categoryTitle}>{title}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className={styles.mono}>
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TypographyPreview({ entry }: { entry: TokenEntry }) {
  const property = entry.path.split('.')[1]
  const style: CSSProperties = { color: 'var(--color-text-default)' }
  if (property === 'family') style.fontFamily = cssVar(entry.path)
  else if (property === 'size') style.fontSize = cssVar(entry.path)
  else if (property === 'weight') style.fontWeight = cssVar(entry.path)
  else if (property === 'leading') style.lineHeight = cssVar(entry.path)
  return <span style={style}>Ag</span>
}

function ContrastRow({
  pair,
  darkValues,
}: {
  pair: ContrastPair & { id: string }
  darkValues: Record<string, string>
}) {
  const tokensObject = tokens as unknown as Record<string, unknown>
  const lightFg = lookup(tokensObject, pair.fg)
  const lightBg = lookup(tokensObject, pair.bg)
  const darkFg = darkValues[pair.fg]
  const darkBg = darkValues[pair.bg]
  const light =
    lightFg !== undefined && lightBg !== undefined ? contrastRatio(lightFg, lightBg) : undefined
  const dark =
    darkFg !== undefined && darkBg !== undefined ? contrastRatio(darkFg, darkBg) : undefined
  const criterion = pair.target >= 4.5 ? '≥ 4.5:1 (texto normal)' : '≥ 3:1 (texto grande y UI)'

  return (
    <tr>
      <th scope="row" className={styles.mono}>
        {pair.id}
      </th>
      <td className={styles.mono}>{pair.fg}</td>
      <td className={styles.mono}>{pair.bg}</td>
      <td>{light !== undefined ? <RatioCell ratio={light} target={pair.target} /> : '—'}</td>
      <td>{dark !== undefined ? <RatioCell ratio={dark} target={pair.target} /> : '—'}</td>
      <td>{criterion}</td>
    </tr>
  )
}

function RatioCell({ ratio, target }: { ratio: number; target: number }) {
  const pass = ratio >= target
  return (
    <span className={pass ? styles.ratioPass : styles.ratioFail}>
      {ratio.toFixed(2)}:1 {pass ? '✓' : '✗'}
    </span>
  )
}

function Swatch({ value }: { value: string }) {
  return (
    <span className={styles.swatch}>
      <span className={styles.swatchColor} style={{ backgroundColor: value }} />
      {value}
    </span>
  )
}

function CopyVarButton({ varName: cssVariable }: { varName: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(cssVariable)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin portapapeles (contexto no seguro): el valor sigue siendo seleccionable.
    }
  }

  return (
    <span className={styles.copyCell}>
      <Button size="sm" variant="secondary" onClick={copy} aria-label={`Copiar ${cssVariable}`}>
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
      <span role="status" aria-live="polite" className={styles.visuallyHidden}>
        {copied ? `Copiado ${cssVariable}` : ''}
      </span>
    </span>
  )
}
