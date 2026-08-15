import type { ComponentExample } from '../examples'
import { FormField } from '../form-field'
import { Select } from './Select'

const planOptions = (
  <>
    <option value="free">Free</option>
    <option value="pro">Pro</option>
    <option value="team">Team</option>
  </>
)

const selectExamples: ComponentExample[] = [
  {
    id: 'basic',
    title: 'Basic',
    description: 'Selección única con label vía FormField.',
    code: '<FormField label="Plan">\n  <Select defaultValue="pro">\n    <option value="free">Free</option>\n    <option value="pro">Pro</option>\n  </Select>\n</FormField>',
    render: () => (
      <FormField label="Plan">
        <Select defaultValue="pro">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
      </FormField>
    ),
  },
  {
    id: 'with-placeholder',
    title: 'With placeholder option',
    description: 'Opción inicial deshabilitada que fuerza una elección.',
    code: '<FormField label="Plan" description="You can change it later.">\n  <Select defaultValue="">\n    <option value="" disabled>Select a plan…</option>\n    <option value="free">Free</option>\n    <option value="pro">Pro</option>\n  </Select>\n</FormField>',
    render: () => (
      <FormField label="Plan" description="You can change it later.">
        <Select defaultValue="">
          <option value="" disabled>
            Select a plan…
          </option>
          {planOptions}
        </Select>
      </FormField>
    ),
  },
  {
    id: 'disabled',
    title: 'Disabled',
    description: 'Select no interactivo; no recibe foco.',
    code: '<FormField label="Plan">\n  <Select disabled defaultValue="pro">\n    <option value="free">Free</option>\n    <option value="pro">Pro</option>\n  </Select>\n</FormField>',
    render: () => (
      <FormField label="Plan">
        <Select disabled defaultValue="pro">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
      </FormField>
    ),
  },
  {
    id: 'invalid',
    title: 'Invalid',
    description: 'Estado de error: borde danger, aria-invalid y mensaje vía FormField.',
    code: '<FormField label="Plan" error="Select a plan to continue.">\n  <Select defaultValue="">\n    <option value="" disabled>Select a plan…</option>\n    <option value="free">Free</option>\n  </Select>\n</FormField>',
    render: () => (
      <FormField label="Plan" error="Select a plan to continue.">
        <Select defaultValue="">
          <option value="" disabled>
            Select a plan…
          </option>
          <option value="free">Free</option>
        </Select>
      </FormField>
    ),
  },
]

export default selectExamples
