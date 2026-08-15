/// <reference types="vite/client" />
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import reactDocgenTS from 'react-docgen-typescript'
import { tokens } from '@ods-ai/tokens'
import type { ComponentExample } from '../examples'
import type { ComponentMetadata } from './types'

/**
 * Eager registry of canonical examples (source of truth, SPEC §6). Vite requires
 * static patterns for import.meta.glob — component folders are one level deep.
 */
const exampleModules = import.meta.glob<ComponentExample[]>('../*/*.examples.tsx', {
  eager: true,
  import: 'default',
})

/** Prose descriptors for the future docs app and AI retrieval layer. */
const COMPONENT_DESCRIPTORS: Record<
  string,
  {
    description: string
    tags: string[]
    a11ySummary: string
    variants?: string[]
    sizes?: string[]
  }
> = {
  button: {
    description:
      'Botón de acción con variantes primary, secondary, ghost y destructive, tamaños sm/md/lg y estado de carga.',
    tags: ['button', 'action', 'form'],
    a11ySummary:
      'Semántica nativa de <button>; foco visible con anillo; loading usa aria-busy y deshabilita la interacción.',
    variants: ['primary', 'secondary', 'ghost', 'destructive'],
    sizes: ['sm', 'md', 'lg'],
  },
  input: {
    description:
      'Campo de texto de una línea basado en el input nativo, con estados focus, disabled, readOnly e invalid.',
    tags: ['input', 'text', 'form', 'field'],
    a11ySummary:
      'Semántica nativa de <input>; invalid marca aria-invalid y el estado visual de error.',
  },
  'form-field': {
    description:
      'Resuelve la asociación accesible entre label, control, description y error mediante htmlFor y aria-describedby.',
    tags: ['form', 'label', 'field', 'validation'],
    a11ySummary:
      'Asocia label y control con htmlFor; description y error vía aria-describedby; el error usa role=alert.',
  },
  checkbox: {
    description:
      'Casilla de verificación nativa con estados checked, disabled e invalid, integrable con FormField.',
    tags: ['checkbox', 'form', 'toggle', 'selection'],
    a11ySummary:
      'Checkbox nativo: teclado (Space), estados checked/disabled y rol checkbox nativos; invalid marca aria-invalid y el estado visual de error.',
  },
  select: {
    description:
      'Selector de una sola opción basado en el select nativo, con estados focus, disabled e invalid.',
    tags: ['select', 'form', 'dropdown', 'selection'],
    a11ySummary:
      'Select nativo: patrón de selección única con navegación por teclado, popup y roles combobox/listbox nativos; invalid marca aria-invalid.',
  },
  modal: {
    description:
      'Diálogo modal controlado sobre el dialog nativo, con gestión de foco, cierre con Escape y backdrop.',
    tags: ['modal', 'dialog', 'overlay', 'focus'],
    a11ySummary:
      'Dialog nativo con showModal: focus trap, fondo inerte y Escape nativos; restore de foco y aria-labelledby/describedby gestionados por el componente.',
  },
  badge: {
    description:
      'Etiqueta de estado en forma de píldora con variantes neutral, success, warning y danger.',
    tags: ['badge', 'status', 'label'],
    a11ySummary:
      'El significado lo transmite el texto (nunca solo color); contraste AA verificado en light y dark.',
  },
  spinner: {
    description:
      'Indicador de progreso circular, decorativo por defecto o comunicativo (role=status) cuando recibe un label.',
    tags: ['spinner', 'loading', 'progress'],
    a11ySummary:
      'Por defecto aria-hidden y sin anuncio; con label pasa a role=status. Respeta prefers-reduced-motion.',
  },
}

const parser = reactDocgenTS.withCustomConfig(
  join(import.meta.dirname, '..', '..', 'tsconfig.json'),
  { shouldRemoveUndefinedFromOptional: true },
)

function kebabToPascal(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function detectComponents(srcDir: string): string[] {
  return readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !['metadata', 'test-utils', 'utils'].includes(entry.name))
    .filter((entry) =>
      existsSync(join(srcDir, entry.name, `${kebabToPascal(entry.name)}.examples.tsx`)),
    )
    .map((entry) => entry.name)
    .sort()
}

/** Maps every generated token path to its CSS variable name (--color-action-primary). */
function collectTokenPaths(): Map<string, string> {
  const map = new Map<string, string>()
  const walk = (node: unknown, prefix: string): void => {
    if (typeof node === 'string') return
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'string') map.set(`--${path.replaceAll('.', '-')}`, path)
      else walk(value, path)
    }
  }
  walk(tokens, '')
  return map
}

function collectCssVarNames(file: string): string[] {
  const content = readFileSync(file, 'utf8')
  return [...content.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((match) => match[1] ?? '')
}

export async function buildAllMetadata(
  srcDir = join(import.meta.dirname, '..'),
): Promise<ComponentMetadata[]> {
  const tokenPaths = collectTokenPaths()
  const results: ComponentMetadata[] = []

  for (const component of detectComponents(srcDir)) {
    const name = kebabToPascal(component)
    const examples = exampleModules[`../${component}/${name}.examples.tsx`]
    if (!examples) {
      throw new Error(`No canonical examples found for component "${component}"`)
    }

    const cssFile = join(srcDir, component, `${name}.module.css`)
    const tokensUsed = [
      ...new Set(
        collectCssVarNames(cssFile)
          .map((cssName) => tokenPaths.get(cssName))
          .filter((path): path is string => Boolean(path)),
      ),
    ].sort()

    const docgenInfo = parser.parse(join(srcDir, component, `${name}.tsx`))
    const props = (docgenInfo[0]?.props ? Object.values(docgenInfo[0].props) : [])
      .map((prop) => ({
        name: prop.name,
        required: Boolean(prop.required),
        type: prop.type?.name ?? 'unknown',
        ...(prop.defaultValue?.value ? { defaultValue: prop.defaultValue.value } : {}),
        ...(prop.description ? { description: prop.description } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const descriptor = COMPONENT_DESCRIPTORS[component]
    if (!descriptor) {
      throw new Error(`Missing COMPONENT_DESCRIPTORS entry for "${component}"`)
    }
    results.push({
      id: `ods-ai/${component}`,
      kind: 'component',
      name,
      component,
      description: descriptor.description,
      props,
      variants: descriptor?.variants ?? [],
      sizes: descriptor?.sizes,
      tokensUsed,
      examples: examples.map(({ id, title, description, code }) => ({
        id,
        title,
        description,
        code,
      })),
      tags: descriptor.tags,
      a11ySummary: descriptor.a11ySummary,
      url: `/components/${component}`,
      sourcePath: `packages/react/src/${component}/${name}.tsx`,
    })
  }

  return results
}

export async function writeMetadata(): Promise<void> {
  const metadata = await buildAllMetadata()
  const outDir = join(import.meta.dirname, '..', '..', 'dist', 'metadata')
  mkdirSync(outDir, { recursive: true })
  for (const entry of metadata) {
    writeFileSync(join(outDir, `${entry.component}.json`), JSON.stringify(entry, null, 2))
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(metadata, null, 2))
}
