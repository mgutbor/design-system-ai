import type { ComponentExample } from '../examples'
import { Button } from './Button'

const buttonExamples: ComponentExample[] = [
  {
    id: 'primary',
    title: 'Primary',
    description: 'Acción principal de la página.',
    code: '<Button>Save changes</Button>',
    render: () => <Button>Save changes</Button>,
  },
  {
    id: 'secondary',
    title: 'Secondary',
    description: 'Acción alternativa; bordes y texto sobre fondo neutro.',
    code: '<Button variant="secondary">Cancel</Button>',
    render: () => <Button variant="secondary">Cancel</Button>,
  },
  {
    id: 'ghost',
    title: 'Ghost',
    description: 'Acción de baja prominencia, sin borde.',
    code: '<Button variant="ghost">Learn more</Button>',
    render: () => <Button variant="ghost">Learn more</Button>,
  },
  {
    id: 'destructive',
    title: 'Destructive',
    description: 'Acción destructiva o irreversible.',
    code: '<Button variant="destructive">Delete account</Button>',
    render: () => <Button variant="destructive">Delete account</Button>,
  },
  {
    id: 'loading',
    title: 'Loading',
    description: 'Estado de carga: deshabilita la interacción y muestra un spinner.',
    code: '<Button loading>Processing…</Button>',
    render: () => <Button loading>Processing…</Button>,
  },
]

export default buttonExamples
