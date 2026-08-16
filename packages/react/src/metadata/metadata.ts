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
    /** Guía de decisión: cuándo usar el componente (V1-0). */
    whenToUse?: string[]
    /** Guía de decisión: cuándo NO usar el componente (V1-0). */
    whenNotToUse?: string[]
    /** Comportamiento relevante no evidente desde la API. */
    behavior?: string
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
    whenToUse: [
      'Ejecutar una acción (guardar, enviar, eliminar).',
      'primary: la acción principal de la vista (una por vista, idealmente).',
      'secondary: acciones alternativas junto a una primaria.',
      'ghost: acciones de baja prominencia (tablas, listas).',
      'destructive: acciones destructivas o irreversibles, siempre con confirmación previa.',
    ],
    whenNotToUse: [
      'Para navegar: usa un enlace (el DS no expone un Button polimórfico en v1 — ADR-007).',
      'Para elegir una opción dentro de un formulario: usa Select.',
    ],
  },
  input: {
    description:
      'Campo de texto de una línea basado en el input nativo, con estados focus, disabled, readOnly e invalid.',
    tags: ['input', 'text', 'form', 'field'],
    a11ySummary:
      'Semántica nativa de <input>; invalid marca aria-invalid y el estado visual de error.',
    whenToUse: [
      'Entrada de texto libre de una línea (texto, email, contraseña…).',
      'Junto a FormField cuando necesite label, descripción o error accesibles.',
    ],
    whenNotToUse: [
      'Elegir una opción de una lista: usa Select.',
      'Sí/no o varias opciones independientes: usa Checkbox.',
      'Texto de varias líneas: usa un <textarea> nativo (fuera del DS v1).',
    ],
    behavior:
      'Solo gestiona su propio estado y apariencia; la asociación accesible (label, description, error) la resuelve FormField. Estados: focus (anillo), disabled, readOnly e invalid (aria-invalid + borde danger).',
  },
  'form-field': {
    description:
      'Resuelve la asociación accesible entre label, control, description y error mediante htmlFor y aria-describedby.',
    tags: ['form', 'label', 'field', 'validation'],
    a11ySummary:
      'Asocia label y control con htmlFor; description y error vía aria-describedby; el error usa role=alert.',
    whenToUse: [
      'Cualquier control del DS que necesite label, descripción o mensaje de error accesibles (Input, Select, Checkbox…).',
    ],
    whenNotToUse: [
      'Controles sin label visible (p. ej. iconos con aria-label).',
      'Solo maquetación: no aporta estructura visual por sí mismo.',
    ],
    behavior:
      'Genera un id estable (useId) y cablea htmlFor + aria-describedby entre label, control, description y error. El error reemplaza la description, se anuncia con role="alert" y activa invalid en el control. Contrato FormFieldControlProps: inyecta exactamente id, aria-describedby e invalid — cualquier control que los declare es compatible sin modificar FormField.',
  },
  checkbox: {
    description:
      'Casilla de verificación nativa con estados checked, disabled e invalid, integrable con FormField.',
    tags: ['checkbox', 'form', 'toggle', 'selection'],
    a11ySummary:
      'Checkbox nativo: teclado (Space), estados checked/disabled y rol checkbox nativos; invalid marca aria-invalid y el estado visual de error.',
    whenToUse: [
      'Confirmar sí/no (aceptar términos, activar una opción).',
      'Seleccionar varias opciones independientes de un grupo.',
      'Junto a FormField para label, descripción y error accesibles.',
    ],
    whenNotToUse: ['Elegir una única opción de varias: usa Select.', 'Texto libre: usa Input.'],
    behavior:
      'Input nativo type="checkbox" (no sobreescribible): teclado con Space, estados checked/disabled/required e invalid (aria-invalid + anillo danger).',
  },
  select: {
    description:
      'Selector de una sola opción basado en el select nativo, con estados focus, disabled e invalid.',
    tags: ['select', 'form', 'dropdown', 'selection'],
    a11ySummary:
      'Select nativo: patrón de selección única con navegación por teclado, popup y roles combobox/listbox nativos; invalid marca aria-invalid.',
    whenToUse: [
      'Elegir una única opción de una lista conocida — el select nativo es el patrón accesible correcto.',
      'Listas largas o con type-ahead (nativo).',
      'Junto a FormField para label, descripción y error accesibles.',
    ],
    whenNotToUse: [
      'Entrada de texto libre: usa Input.',
      'Sí/no o varias opciones independientes: usa Checkbox.',
      'Selección múltiple (multiple): fuera del alcance v1 (patrón distinto).',
    ],
    behavior:
      'Select nativo: teclado (flechas, type-ahead), popup y roles combobox/listbox nativos; no reimplementa un dropdown custom. Estados focus, disabled e invalid. La flecha nativa se mantiene en v1.',
  },
  modal: {
    description:
      'Diálogo modal controlado sobre el dialog nativo, con gestión de foco, cierre con Escape y backdrop.',
    tags: ['modal', 'dialog', 'overlay', 'focus'],
    a11ySummary:
      'Dialog nativo con showModal: focus trap, fondo inerte y Escape nativos; restore de foco y aria-labelledby/describedby gestionados por el componente.',
    whenToUse: [
      'Tareas que requieren atención focalizada y bloqueante (confirmaciones, formularios cortos).',
      'Información crítica que el usuario debe ver antes de continuar.',
    ],
    whenNotToUse: [
      'Errores o feedback rápido: mantén la información en la página.',
      'Contenido largo de lectura: mejor una página o sección.',
      'Navegación principal: nunca uses un modal como estructura de navegación.',
    ],
    behavior:
      'Dialog nativo con showModal(): top layer, backdrop, focus trap, fondo inerte y cierre con Escape nativos; restore de foco al cerrar y aria-labelledby/describedby gestionados por el componente. El panel hace scroll interno con contenido largo. No hay API pública de focus management.',
  },
  badge: {
    description:
      'Etiqueta de estado en forma de píldora con variantes neutral, success, warning y danger.',
    tags: ['badge', 'status', 'label'],
    a11ySummary:
      'El significado lo transmite el texto (nunca solo color); contraste AA verificado en light y dark.',
    whenToUse: [
      'Etiqueta corta de estado (neutral, success, warning, danger) cuyo significado transmite el texto.',
      'Complementar un estado ya comunicado por el texto circundante.',
    ],
    whenNotToUse: [
      'Acciones: usa Button.',
      'Comunicar un estado solo con color: el texto es obligatorio (WCAG 1.4.1).',
      'Contenido largo: los labels deben ser cortos.',
    ],
  },
  spinner: {
    description:
      'Indicador de progreso circular, decorativo por defecto o comunicativo (role=status) cuando recibe un label.',
    tags: ['spinner', 'loading', 'progress'],
    a11ySummary:
      'Por defecto aria-hidden y sin anuncio; con label pasa a role=status. Respeta prefers-reduced-motion.',
    whenToUse: [
      'Carga sin texto circundante que la comunique: pasa un label (role="status").',
      'Carga decorativa dentro de un control (p. ej. Button loading): sin label, aria-hidden.',
    ],
    whenNotToUse: [
      'Carga tan rápida que no requiere indicador.',
      'Como única señal de estado sin label: no comunicaría nada a lectores de pantalla.',
    ],
    behavior:
      'Por defecto decorativo (aria-hidden, sin rol); con label pasa a role="status" y anuncia el texto. Respeta prefers-reduced-motion. Hereda el color del contexto (currentColor).',
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
      ...(descriptor.whenToUse ? { whenToUse: descriptor.whenToUse } : {}),
      ...(descriptor.whenNotToUse ? { whenNotToUse: descriptor.whenNotToUse } : {}),
      ...(descriptor.behavior ? { behavior: descriptor.behavior } : {}),
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
