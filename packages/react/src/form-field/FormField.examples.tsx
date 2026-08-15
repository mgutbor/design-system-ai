import type { ComponentExample } from '../examples'
import { FormField } from './FormField'
import { Input } from '../input'

const formFieldExamples: ComponentExample[] = [
  {
    id: 'basic',
    title: 'Basic',
    description: 'Label asociado al control vía htmlFor + id.',
    code: '<FormField label="Email">\n  <Input type="email" placeholder="you@example.com" />\n</FormField>',
    render: () => (
      <FormField label="Email">
        <Input type="email" placeholder="you@example.com" />
      </FormField>
    ),
  },
  {
    id: 'with-description',
    title: 'With description',
    description: 'Texto de ayuda conectado con aria-describedby.',
    code: '<FormField label="Password" description="At least 8 characters.">\n  <Input type="password" />\n</FormField>',
    render: () => (
      <FormField label="Password" description="At least 8 characters.">
        <Input type="password" />
      </FormField>
    ),
  },
  {
    id: 'with-error',
    title: 'With error',
    description: 'Mensaje de error: role="alert", aria-describedby y estado invalid.',
    code: '<FormField label="Email" error="Enter a valid email address.">\n  <Input type="email" defaultValue="jane@" />\n</FormField>',
    render: () => (
      <FormField label="Email" error="Enter a valid email address.">
        <Input type="email" defaultValue="jane@" />
      </FormField>
    ),
  },
]

export default formFieldExamples
