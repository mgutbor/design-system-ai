/**
 * Own public API per component (F5.1 audit).
 *
 * The raw metadata from react-docgen-typescript mixes a component's own props
 * with ~290 inherited HTML attributes. A denylist alone cannot classify them
 * reliably (e.g. `title` is a global HTML attribute AND Modal's own prop, and
 * `size` is inherited on Input/Select but own on Button/Spinner).
 *
 * This whitelist is the explicit, deterministic source of truth for what is
 * "own API" per component. It is derived from each component's public types
 * and is validated by tests against the real metadata JSON (an own prop that
 * disappears from the generated metadata fails the integrity test, so the
 * whitelist cannot silently drift). Inherited HTML attributes never appear.
 *
 * Rule (F5.1): do not extend this list without a real component change.
 */
export const OWN_PROPS_BY_COMPONENT: Record<string, string[]> = {
  button: ['variant', 'size', 'loading'],
  input: ['invalid'],
  checkbox: ['invalid'],
  select: ['invalid'],
  badge: ['variant'],
  spinner: ['size', 'label'],
  modal: [
    'open',
    'onClose',
    'title',
    'description',
    'closeOnEscape',
    'closeOnBackdrop',
    'children',
  ],
  'form-field': ['label', 'htmlFor', 'description', 'error', 'children'],
}

/** Own API props for a component slug (empty for unknown components). */
export function ownPropsFor(component: string): string[] {
  return OWN_PROPS_BY_COMPONENT[component] ?? []
}
