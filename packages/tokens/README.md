# @ods-ai/tokens

Design tokens framework-agnósticos del design system **Open Design System AI** (ODS AI): colores, tipografía, espaciado, radios, motion y z-index, con temas claro/oscuro y contraste validado.

El paquete expone:

- **`@ods-ai/tokens/tokens.css`** — las 97 variables CSS en `:root` + 18 overrides en `[data-theme="dark"]`.
- **`@ods-ai/tokens`** (JS/TS) — el objeto `tokens` resuelto (valores light) y la función `getToken()` con fail-fast.

## Instalación

```bash
npm install @ods-ai/tokens
```

## Uso en CSS

```css
@import '@ods-ai/tokens/tokens.css';

.card {
  color: var(--color-text-default);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
```

Variables semánticas (las que deben consumir los componentes): `--color-action-primary`, `--color-text-default`, `--color-focus-ring`, etc. Las variables primitivas (`--color-blue-600`, `--space-4`, `--radius-md`, `--font-size-md`, `--motion-duration-base`, `--zindex-sticky`) existen en el mismo archivo.

## Uso en JS/TS

```ts
import { getToken, tokens } from '@ods-ai/tokens'

const primary = getToken('color.action.primary') // '#2563eb' (valor light)
const space = tokens.space[4] // '1rem'
```

- `getToken(path)` lanza un error si la ruta no existe (fail-fast, sin valores `undefined` silenciosos).
- `tokens` contiene los valores resueltos del **tema light**; los valores dark viven solo en el CSS (se aplican vía `data-theme="dark"`).

## Dark mode

Los overrides del tema oscuro se aplican con el atributo `data-theme` en el documento:

```html
<html data-theme="dark"></html>
```

```js
document.documentElement.dataset.theme = 'dark' // o 'light'
```

En dark, las variables semánticas apuntan a primitivos oscuros (p. ej. `--color-action-primary` → `--color-blue-400`); tu CSS no cambia.

## Categorías de tokens

| Categoría               | Descripción                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Color — primitivos (34) | Paleta base (`color.blue.600`, `color.gray.900`, …).                                                                      |
| Color — semánticos (18) | Rol funcional (`color.action.primary`, `color.text.default`, `color.focus-ring`, …); los componentes solo consumen estos. |
| Font                    | `family`, `size` (7), `weight` (4) y `leading` (3).                                                                       |
| Space (13)              | Escala de espaciado.                                                                                                      |
| Radius (5)              | Radios de borde.                                                                                                          |
| Motion                  | `duration` (3) y `easing` (2).                                                                                            |
| Z-index (6)             | Escala de apilamiento.                                                                                                    |
| Contraste               | 23 pares validados (ratio WCAG ≥ 4.5:1 / ≥ 3:1).                                                                          |

## Semánticos → primitivos

Los tokens semánticos referencian primitivos: `color.action.primary` → `color.blue.600`. Usa siempre la capa semántica en componentes; así el tema (claro/oscuro) y los futuros cambios de marca no requieren tocar tu código.

## Accesibilidad

- Contraste de los 23 pares de texto/estado validado contra WCAG (4.5:1 texto normal, 3:1 componentes de interfaz).
- El color nunca es la única señal de estado (los componentes añaden iconos/texto).

## Documentación

- Documentación completa de tokens, guía de uso y explorador: repositorio [mgutbor/design-system-ai](https://github.com/mgutbor/design-system-ai) (apps/docs → Foundations).
- Componentes que consumen estos tokens: [@ods-ai/react](https://github.com/mgutbor/design-system-ai/blob/main/packages/react/README.md).

## Licencia

MIT.
