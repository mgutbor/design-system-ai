/**
 * Evaluation dataset (documented in docs/knowledge.md).
 *
 * Every case declares the query, the expected top-1 component (empty string
 * when there is no single expected answer) and the set of components that are
 * acceptable anywhere in the top-K. Ambiguous queries are correct when their
 * results are reasonable and deterministic; queries with no evidence must
 * return [].
 */
export interface EvalCase {
  query: string
  /** Expected first result. Empty string when no single answer is expected. */
  expectedTop1: string
  /** Components acceptable within the top-K (defaults to [expectedTop1]). */
  acceptedInTopK?: string[]
  /** Components that must NOT appear at all. */
  forbidden?: string[]
  /** Expected to return zero results (no evidence → [] is correct). */
  expectEmpty?: boolean
}

export const EVAL_DATASET: EvalCase[] = [
  // ── A) Direct queries about components ────────────────────────────────
  { query: 'cómo usar Button', expectedTop1: 'button' },
  { query: 'cómo usar Input', expectedTop1: 'input' },
  { query: 'cómo usar Checkbox', expectedTop1: 'checkbox' },
  { query: 'cómo usar Select', expectedTop1: 'select' },
  { query: 'cómo usar Badge', expectedTop1: 'badge' },
  { query: 'cómo usar Spinner', expectedTop1: 'spinner' },
  { query: 'cómo usar Modal', expectedTop1: 'modal' },
  // FormField is composed with Input/Checkbox/Select: those related form
  // controls legitimately appear below FormField (shared form/field tags).
  {
    query: 'cómo usar FormField',
    expectedTop1: 'form-field',
    acceptedInTopK: ['form-field', 'input', 'checkbox', 'select'],
  },

  // ── B) Intent queries ─────────────────────────────────────────────────
  { query: 'Necesito un botón para eliminar', expectedTop1: 'button' },
  { query: 'Quiero un dropdown', expectedTop1: 'select' },
  { query: 'Necesito seleccionar una opción', expectedTop1: 'select' },
  {
    query: 'Quiero validar un campo',
    expectedTop1: 'input',
    acceptedInTopK: ['input', 'form-field'],
  },
  {
    query: 'Necesito mostrar un error de formulario',
    expectedTop1: 'form-field',
    acceptedInTopK: ['form-field', 'input', 'select', 'checkbox'],
  },
  { query: 'Quiero indicar un estado', expectedTop1: 'badge' },
  {
    query: 'Necesito mostrar una carga',
    expectedTop1: 'spinner',
    acceptedInTopK: ['spinner', 'button'],
  },
  { query: 'Quiero abrir una ventana modal', expectedTop1: 'modal' },
  {
    // Related form controls (shared form/field tags) are legitimate below
    // the leading FormField.
    query: 'Necesito un campo de formulario con descripción',
    expectedTop1: 'form-field',
    acceptedInTopK: ['form-field', 'input', 'checkbox', 'select'],
  },

  // ── C) API / prop queries ─────────────────────────────────────────────
  {
    query: '¿Qué componentes tienen invalid?',
    expectedTop1: '',
    acceptedInTopK: ['checkbox', 'input', 'select'],
    forbidden: ['modal', 'badge', 'spinner'],
  },
  { query: '¿Qué props acepta Button?', expectedTop1: 'button' },
  { query: '¿Qué tamaños tiene Button?', expectedTop1: 'button' },
  { query: '¿Qué variantes tiene Badge?', expectedTop1: 'badge' },
  { query: '¿Cómo controlo Modal?', expectedTop1: 'modal' },
  { query: '¿Cómo cierro Modal?', expectedTop1: 'modal' },
  {
    query: '¿Qué componente acepta loading?',
    expectedTop1: '',
    acceptedInTopK: ['spinner', 'button'],
    forbidden: ['modal', 'badge', 'checkbox', 'select', 'input', 'form-field'],
  },

  // ── D) Accessibility queries ──────────────────────────────────────────
  {
    query: '¿Qué componente tiene soporte para invalid?',
    expectedTop1: '',
    acceptedInTopK: ['checkbox', 'input', 'select'],
    forbidden: ['modal', 'badge', 'spinner'],
  },
  { query: '¿Cómo se gestiona el foco en Modal?', expectedTop1: 'modal' },
  // No single component "works with keyboard" is distinguishable from this
  // query — every native control does. No evidence → [] is the honest answer.
  { query: '¿Qué componente funciona con teclado?', expectedTop1: '', expectEmpty: true },
  {
    query: '¿Cómo se asocia FormField con Input?',
    expectedTop1: 'form-field',
    acceptedInTopK: ['form-field', 'input', 'checkbox'],
  },

  // ── E) Token queries ──────────────────────────────────────────────────
  {
    query: '¿Qué componente usa color.focus.ring?',
    expectedTop1: '',
    acceptedInTopK: ['button', 'checkbox', 'input', 'modal', 'select'],
    forbidden: ['spinner', 'badge', 'form-field'],
  },
  {
    // Badge legitimately uses color.action.danger (danger variant).
    query: '¿Qué componentes usan color.action.danger?',
    expectedTop1: '',
    acceptedInTopK: ['button', 'badge', 'checkbox', 'input', 'select', 'form-field'],
    forbidden: ['modal', 'spinner'],
  },
  { query: '¿Qué tokens utiliza Modal?', expectedTop1: 'modal' },

  // ── F) Ambiguous queries (multiple reasonable answers) ────────────────
  {
    query: 'campo inválido',
    expectedTop1: 'input',
    acceptedInTopK: ['input', 'checkbox', 'select'],
  },
  {
    query: 'control de formulario',
    expectedTop1: 'form-field',
    acceptedInTopK: ['input', 'select', 'checkbox', 'form-field', 'button'],
    forbidden: ['modal', 'spinner', 'badge'],
  },
  {
    query: 'selección',
    expectedTop1: '',
    acceptedInTopK: ['checkbox', 'select'],
    forbidden: ['modal', 'badge', 'spinner', 'input', 'form-field', 'button'],
  },
  { query: 'estado', expectedTop1: 'badge' },
  { query: 'botón', expectedTop1: 'button' },
  { query: 'formulario', expectedTop1: 'form-field' },

  // ── G) Negative / irrelevant queries (no evidence → []) ───────────────
  { query: 'Necesito una tabla', expectedTop1: '', expectEmpty: true },
  { query: 'Quiero una tarjeta', expectedTop1: '', expectEmpty: true },
  { query: 'Necesito tabs', expectedTop1: '', expectEmpty: true },
  { query: 'Quiero un toast', expectedTop1: '', expectEmpty: true },
  { query: 'Necesito un calendario', expectedTop1: '', expectEmpty: true },
  { query: 'Necesito un date picker', expectedTop1: '', expectEmpty: true },
  { query: 'Quiero un tooltip', expectedTop1: '', expectEmpty: true },
  { query: 'Necesito un avatar', expectedTop1: '', expectEmpty: true },
  { query: 'Quiero un accordion', expectedTop1: '', expectEmpty: true },
  { query: 'Necesito un drawer', expectedTop1: '', expectEmpty: true },
  { query: 'Quiero autenticación', expectedTop1: '', expectEmpty: true },
  { query: 'Necesito una API', expectedTop1: '', expectEmpty: true },
  { query: 'Quiero hacer login', expectedTop1: '', expectEmpty: true },

  // Non-existent component names must never resolve to a real component.
  { query: 'Use DataGrid', expectedTop1: '', expectEmpty: true },
  { query: 'Use DatePicker', expectedTop1: '', expectEmpty: true },
  { query: 'Use Toast', expectedTop1: '', expectEmpty: true },
  { query: 'Use Card', expectedTop1: '', expectEmpty: true },
  { query: 'Use Tabs', expectedTop1: '', expectEmpty: true },
  { query: 'Use Avatar', expectedTop1: '', expectEmpty: true },
]
