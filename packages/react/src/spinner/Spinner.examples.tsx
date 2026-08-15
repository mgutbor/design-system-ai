import type { ComponentExample } from '../examples'
import { Spinner } from './Spinner'

const spinnerExamples: ComponentExample[] = [
  {
    id: 'decorative',
    title: 'Decorative',
    description: 'Indicador puramente visual: aria-hidden, sin anuncio.',
    code: '<Spinner />',
    render: () => <Spinner />,
  },
  {
    id: 'with-label',
    title: 'With label',
    description: 'Comunica estado de carga con role="status" y aria-label.',
    code: '<Spinner label="Loading" />',
    render: () => <Spinner label="Loading" />,
  },
  {
    id: 'sizes',
    title: 'Sizes',
    description: 'Tamaños sm, md y lg.',
    code: '<Spinner size="sm" />\n<Spinner />\n<Spinner size="lg" />',
    render: () => (
      <span style={{ display: 'inline-flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        <Spinner size="sm" />
        <Spinner />
        <Spinner size="lg" />
      </span>
    ),
  },
]

export default spinnerExamples
