import type { ComponentExample } from '../examples'
import { Input } from './Input'

const inputExamples: ComponentExample[] = [
  {
    id: 'basic',
    title: 'Basic',
    description: 'Campo de texto con placeholder.',
    code: '<Input placeholder="Enter your name" />',
    render: () => <Input placeholder="Enter your name" />,
  },
  {
    id: 'with-value',
    title: 'With value',
    description: 'Campo con valor inicial controlado o no controlado.',
    code: '<Input defaultValue="Jane Doe" />',
    render: () => <Input defaultValue="Jane Doe" />,
  },
  {
    id: 'disabled',
    title: 'Disabled',
    description: 'Campo no interactivo; no recibe foco.',
    code: '<Input disabled placeholder="Unavailable" />',
    render: () => <Input disabled placeholder="Unavailable" />,
  },
  {
    id: 'readonly',
    title: 'Read only',
    description: 'Campo legible pero no editable; sigue recibiendo foco.',
    code: '<Input readOnly value="Jane Doe" />',
    render: () => <Input readOnly value="Jane Doe" />,
  },
  {
    id: 'invalid',
    title: 'Invalid',
    description: 'Estado de error: borde de danger y aria-invalid="true".',
    code: '<Input invalid aria-describedby="email-error" />',
    render: () => <Input invalid aria-describedby="email-error" />,
  },
]

export default inputExamples
