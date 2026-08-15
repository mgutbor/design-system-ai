import type { ComponentExample } from '../examples'
import { FormField } from '../form-field'
import { Checkbox } from './Checkbox'

const checkboxExamples: ComponentExample[] = [
  {
    id: 'unchecked',
    title: 'Unchecked',
    description: 'Checkbox sin marcar, con label vía FormField.',
    code: '<FormField label="Subscribe to the newsletter">\n  <Checkbox />\n</FormField>',
    render: () => (
      <FormField label="Subscribe to the newsletter">
        <Checkbox />
      </FormField>
    ),
  },
  {
    id: 'checked',
    title: 'Checked',
    description: 'Checkbox marcado por defecto.',
    code: '<FormField label="I agree to the terms">\n  <Checkbox defaultChecked />\n</FormField>',
    render: () => (
      <FormField label="I agree to the terms">
        <Checkbox defaultChecked />
      </FormField>
    ),
  },
  {
    id: 'disabled',
    title: 'Disabled',
    description: 'Checkbox no interactivo; no recibe foco.',
    code: '<Checkbox aria-label="Feature enabled" disabled defaultChecked />',
    render: () => <Checkbox aria-label="Feature enabled" disabled defaultChecked />,
  },
  {
    id: 'invalid',
    title: 'Invalid',
    description: 'Estado de error: aria-invalid y mensaje vía FormField.',
    code: '<FormField label="I accept the terms" error="You must accept the terms to continue.">\n  <Checkbox />\n</FormField>',
    render: () => (
      <FormField label="I accept the terms" error="You must accept the terms to continue.">
        <Checkbox />
      </FormField>
    ),
  },
]

export default checkboxExamples
