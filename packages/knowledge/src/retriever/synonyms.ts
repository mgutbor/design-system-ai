/**
 * Explicit synonym map (documented in docs/knowledge.md).
 *
 * Keys are normalized (lowercase, no accents, collapsed spaces). A key may be
 * a single token ("dropdown") or a full phrase ("casilla de seleccion") when
 * the phrase has a meaning of its own. The map is intentionally small and
 * explicit — no NLP, no fuzzy matching.
 */
export const SYNONYMS: Record<string, string> = {
  // Component names (en)
  dropdown: 'select',
  combobox: 'select',
  dialog: 'modal',
  dialogo: 'modal',
  ventana: 'modal',
  checkbox: 'checkbox',
  spinner: 'spinner',
  badge: 'badge',
  formulario: 'form-field',
  // The slug is "form-field"; "FormField" written as one word must resolve too
  // (demonstrated false negative: "cómo usar FormField" → []).
  formfield: 'form-field',

  // Component names (es)
  boton: 'button',
  campo: 'input',
  texto: 'text',
  casilla: 'checkbox',
  indicador: 'spinner',
  etiqueta: 'badge',

  // Variants (destructive is needed for "botón destructivo"; "primary" is
  // deliberately absent: it would collide with the token color.action.primary
  // shared by several components and pollute results).
  destructivo: 'destructive',

  // Props / states
  invalido: 'invalid',
  error: 'invalid',
  carga: 'loading',

  // Tags
  estado: 'status',
  seleccion: 'selection',
  seleccionar: 'select',
  opcion: 'select',

  // Full phrases with their own meaning
  'casilla de seleccion': 'checkbox',
  'campo de formulario': 'form-field',
  'campo de texto': 'input',
  'seleccionar una opcion': 'select',
  'etiqueta de estado': 'badge',
  'indicador de carga': 'spinner',
  'ventana modal': 'modal',
}
