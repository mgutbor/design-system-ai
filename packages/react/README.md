# @ods-ai/react

Componentes React accesibles (WCAG 2.2 AA) del design system **Open Design System AI** (ODS AI). APIs públicas pequeñas y explícitas, basadas en la semántica nativa de los elementos HTML: si existe un `<button>` nativo, lo usamos.

Los estilos consumen los [design tokens](https://github.com/mgutbor/design-system-ai/blob/main/packages/tokens/README.md) del paquete `@ods-ai/tokens`; **no se incluyen estilos propios en este paquete**, así que necesitas importar el CSS de tokens (ver [Uso](#uso)).

## Requisitos

- React **^19.2** y react-dom **^19.2** (peer dependencies).
- Para TypeScript: `@types/react` y `@types/react-dom` (no vienen incluidos).

## Instalación

```bash
npm install @ods-ai/react @ods-ai/tokens react react-dom
```

## Uso

### 1. Importa el CSS de tokens (una vez, en la entrada de tu app)

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ods-ai/tokens/tokens.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### 2. Primer componente

```tsx
// src/App.tsx
import { Button } from '@ods-ai/react'

export default function App() {
  return <Button onClick={() => alert('Hola')}>Guardar</Button>
}
```

### 3. Formulario con FormField + Input + Button

El `label`, la descripción y el error se asocian al control mediante `FormField` (ids + ARIA); el `Input` solo gestiona su propio estado.

```tsx
import { useState } from 'react'
import { Button, FormField, Input } from '@ods-ai/react'

export default function App() {
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        console.log(value)
      }}
    >
      <FormField label="Nombre" htmlFor="name" description="Como aparece en tu DNI.">
        <Input id="name" value={value} onChange={(e) => setValue(e.target.value)} />
      </FormField>
      <Button type="submit">Guardar</Button>
    </form>
  )
}
```

## Componentes

| Componente  | Descripción                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`    | Acción (`variant`: `primary` \| `secondary` \| `ghost` \| `destructive`; `size`: `sm` \| `md` \| `lg`; `loading` muestra un spinner y marca `aria-busy`). |
| `FormField` | Asociación accesible label → control → descripción → error.                                                                                               |
| `Input`     | Campo de texto nativo con estados visuales (`invalid`).                                                                                                   |
| `Checkbox`  | Casilla nativa con semántica de teclado y estados (`invalid`).                                                                                            |
| `Select`    | Select nativo con estados visuales (`invalid`).                                                                                                           |
| `Modal`     | Diálogo controlado (`open`, `onClose`), foco atrapado, Escape y clic en el backdrop.                                                                      |
| `Badge`     | Etiqueta corta (`variant`: `neutral` \| `success` \| `warning` \| `danger`). El significado siempre lo transmite el texto, no solo el color.              |
| `Spinner`   | Indicador de progreso (`size`, `label` opcional: con `label` anuncia estado vía `role="status"`; sin él, es decorativo).                                  |

Todos los componentes extienden la API nativa del elemento correspondiente: `data-*`, atributos ARIA y eventos HTML pasan directamente.

## Accesibilidad

- Semántica nativa (roles, teclado y focus-visible del navegador).
- `FormField` cablea `htmlFor`/`id`, `aria-describedby` y `aria-invalid` automáticamente.
- `Modal` atrapa el foco y restaura el foco al cerrar.
- `Button loading` marca `aria-busy` y desactiva la interacción.
- Auditoría WCAG 2.2 AA documentada en `docs/a11y-audit.md` del repositorio.

## Dark mode

El tema se controla desde el atributo `data-theme` del documento (requiere el CSS de tokens):

```tsx
document.documentElement.dataset.theme = 'dark' // o 'light'
```

## TypeScript

Los tipos se incluyen en el paquete (`.d.ts`). Los props propios de cada componente y los heredados de HTML están tipados; la metadata de documentación (`whenToUse`, `whenNotToUse`, `behavior`, props, tokens, ejemplos canónicos) se exporta desde `@ods-ai/react/metadata`:

```ts
import type { ComponentMetadata } from '@ods-ai/react'
import metadata from '@ods-ai/react/metadata'
```

## Documentación

- Documentación completa y ejemplos canónicos: repositorio [mgutbor/design-system-ai](https://github.com/mgutbor/design-system-ai) (apps/docs).
- Tokens: [@ods-ai/tokens](https://github.com/mgutbor/design-system-ai/blob/main/packages/tokens/README.md).

## Licencia

MIT.
