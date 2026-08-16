# Auditoría de accesibilidad — WCAG 2.2 AA (F6)

- **Fecha**: 2026-08-16 (auditoría manual documentada, F6)
- **Alcance**: los 8 componentes de `@ods-ai/react`: Button, Input, FormField, Checkbox, Select, Modal, Badge, Spinner
- **Método**: revisión manual del código + evidencia de tests automatizados (Vitest + RTL + jest-axe) y E2E (Playwright). No se ha ejecutado un lector de pantalla real → los ítems que dependen de uno se marcan **NO VERIFICABLE** (no se inventan resultados).
- **Criterio**: WCAG 2.2 AA.

Leyenda: **PASS** (verificado) · **FAIL** (incumplimiento) · **NO VERIFICABLE** (requiere lector de pantalla real o no comprobable en este entorno).

---

## Criterios transversales

| Criterio                           | Estado              | Evidencia                                                                                                                         |
| ---------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Contraste (1.4.3 AA, 4.5:1 texto)  | PASS (automatizado) | `packages/tokens/src/tokens/contrast.json` — 23 pares verificados por el validador (`pnpm validate` falla si algún par no cumple) |
| Reduced motion (2.3.3 / 2.2.2)     | PASS                | Spinner y Button desactivan la animación con `@media (prefers-reduced-motion: reduce)`                                            |
| Focus visible (2.4.7)              | PASS                | Token `focus.ring` aplicado en todos los controles (border/focus tokens); verificado por tests de estilo en cada componente       |
| No depender solo del color (1.4.1) | PASS                | Badge combina variante visual + semántica de texto; estados de error siempre con mensaje de texto (no solo borde)                 |
| Lector de pantalla real            | NO VERIFICABLE      | No hay entorno con NVDA/VoiceOver en esta auditoría                                                                               |

---

## Button

| Criterio                                | Estado         | Nota                                                                                      |
| --------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| Elemento semántico                      | PASS           | `<button>` nativo                                                                         |
| Teclado (Enter/Space)                   | PASS           | Comportamiento nativo del elemento                                                        |
| Foco visible                            | PASS           | `focus.ring` token                                                                        |
| Nombre accesible                        | PASS           | Contenido textual del botón                                                               |
| Estados (hover/active/disabled/loading) | PASS           | `disabled` real cuando `loading`; `aria-busy={loading}`; spinner decorativo `aria-hidden` |
| Contraste variantes                     | PASS           | Pares en contrast.json (action.primary/secondary/ghost/danger)                            |
| axe                                     | PASS           | jest-axe en `Button.test.tsx`                                                             |
| Lector de pantalla                      | NO VERIFICABLE | —                                                                                         |

## Input

| Criterio           | Estado         | Nota                                                                      |
| ------------------ | -------------- | ------------------------------------------------------------------------- |
| Elemento semántico | PASS           | `<input>` nativo                                                          |
| Nombre accesible   | PASS           | Vía FormField (`<label htmlFor>`) o `aria-label` del consumidor           |
| Estado inválido    | PASS           | `aria-invalid` cuando `invalid`                                           |
| Teclado/foco       | PASS           | Nativo + focus ring                                                       |
| Mensajes de error  | PASS           | Asociados por FormField (`aria-describedby` + `role="alert"` en el error) |
| Contraste          | PASS           | text tokens validados                                                     |
| axe                | PASS           | `Input.test.tsx`                                                          |
| Lector de pantalla | NO VERIFICABLE | —                                                                         |

## FormField

| Criterio                     | Estado         | Nota                                                                                                                   |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Asociación label↔control     | PASS           | `<label htmlFor>` con ID determinista (`useId`); `htmlFor` sobreescribible                                             |
| Descripción                  | PASS           | `aria-describedby` al `p.description` (merge con el del consumidor)                                                    |
| Error                        | PASS           | `aria-describedby` + `role="alert"` (anuncio inmediato en SR); no duplica `aria-invalid` (responsabilidad del control) |
| IDs estables                 | PASS           | `useId` (determinista por render)                                                                                      |
| Compatibilidad con controles | PASS           | Contrato estructural `FormFieldControlProps` (funciona con Input, Select, Checkbox)                                    |
| Lector de pantalla           | NO VERIFICABLE | —                                                                                                                      |

## Checkbox

| Criterio                     | Estado         | Nota                                |
| ---------------------------- | -------------- | ----------------------------------- |
| Elemento semántico           | PASS           | `<input type="checkbox">` nativo    |
| Teclado (Space)              | PASS           | Nativo                              |
| Estado checked/indeterminado | PASS           | Nativo (`checked`, `indeterminate`) |
| Estado inválido              | PASS           | `aria-invalid`                      |
| Nombre accesible             | PASS           | `<label>` (FormField o propio)      |
| Contraste                    | PASS           | Validado                            |
| axe                          | PASS           | `Checkbox.test.tsx`                 |
| Lector de pantalla           | NO VERIFICABLE | —                                   |

## Select

| Criterio                          | Estado         | Nota                                                                                                                                                        |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patrón de selección única         | PASS           | `<select>` nativo (roles implícitos `combobox`/`listbox`, popup y navegación por teclado del navegador — documentado en la ficha de Select y auditado en F2) |
| Teclado (↑/↓/Home/End/Type-ahead) | PASS           | Nativo                                                                                                                                                      |
| Nombre accesible                  | PASS           | Vía FormField o `aria-label`                                                                                                                                |
| Estado inválido                   | PASS           | `aria-invalid`                                                                                                                                              |
| Contraste                         | PASS           | Validado                                                                                                                                                    |
| axe                               | PASS           | `Select.test.tsx`                                                                                                                                           |
| Lector de pantalla                | NO VERIFICABLE | —                                                                                                                                                           |

## Modal

| Criterio            | Estado         | Nota                                                                                                |
| ------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| Rol semántico       | PASS           | `<dialog>` nativo con `showModal()` (rol implícito `dialog`, semántica modal) + `aria-modal="true"` |
| Nombres/descripción | PASS           | `aria-labelledby` (título `h2`) + `aria-describedby` (descripción)                                  |
| Foco al abrir       | PASS           | Nativo (`showModal`); verificado en E2E                                                             |
| Focus trap          | PASS           | Nativo del `<dialog>` modal; verificado en E2E (`modal.spec.ts`)                                    |
| Escape              | PASS           | `onCancel` interceptado, controlado por `closeOnEscape`; verificado en E2E                          |
| Restore focus       | PASS           | Implementado manualmente (`useEffect` devuelve el foco al opener); verificado en E2E                |
| Backdrop            | PASS           | Click en backdrop controlado por `closeOnBackdrop`                                                  |
| Contenido largo     | PASS           | Panel con scroll (tests de contenido largo en F3)                                                   |
| StrictMode/React 19 | PASS           | Verificado en tests de F3                                                                           |
| axe                 | PASS           | `Modal.test.tsx` (jsdom) + Playwright                                                               |
| Lector de pantalla  | NO VERIFICABLE | —                                                                                                   |

## Badge

| Criterio              | Estado         | Nota                                                              |
| --------------------- | -------------- | ----------------------------------------------------------------- |
| Semántica             | PASS           | `<span>` (no interactivo); no usa `role` inventado                |
| No solo color (1.4.1) | PASS           | Variante visual + contenido textual; a11ySummary documenta el uso |
| Contraste             | PASS           | Variantes validadas en contrast.json                              |
| Variantes             | PASS           | `variant?: 'neutral'                                              | 'success' | 'warning' | 'danger'` (justificadas por tokens y casos de uso) |
| axe                   | PASS           | `Badge.test.tsx`                                                  |
| Lector de pantalla    | NO VERIFICABLE | —                                                                 |

## Spinner

| Criterio               | Estado         | Nota                                                                               |
| ---------------------- | -------------- | ---------------------------------------------------------------------------------- |
| Decorativo por defecto | PASS           | `aria-hidden="true"` y **sin** anuncio (sin `role`/`aria-live`) — no molesta al SR |
| Comunicación de estado | PASS           | Con `label`, pasa a `role="status"` (anuncio en SR); sin anuncios duplicados       |
| Reduced motion         | PASS           | Animación desactivada con `prefers-reduced-motion: reduce`                         |
| API mínima             | PASS           | `size` + `label` únicamente                                                        |
| axe                    | PASS           | `Spinner.test.tsx`                                                                 |
| Lector de pantalla     | NO VERIFICABLE | —                                                                                  |

---

## Resumen

| Componente | PASS | FAIL | NO VERIFICABLE |
| ---------- | ---- | ---- | -------------- |
| Button     | 7    | 0    | 1              |
| Input      | 6    | 0    | 1              |
| FormField  | 5    | 0    | 1              |
| Checkbox   | 6    | 0    | 1              |
| Select     | 6    | 0    | 1              |
| Modal      | 10   | 0    | 1              |
| Badge      | 5    | 0    | 1              |
| Spinner    | 5    | 0    | 1              |

**FAIL: 0.** Los 8 componentes cumplen la checklist documentada según el método descrito. Lo único no verificable es la interacción con lectores de pantalla reales (NVDA/VoiceOver), que requiere un entorno dedicado; los patrones usados (nativos + ARIA según APG) son los recomendados. Recomendación: una pasada manual con un SR real como cierre opcional antes del release (queda fuera del alcance automatizable de F6).
