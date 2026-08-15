import type { ComponentExample } from '../examples'
import { Badge } from './Badge'

const badgeExamples: ComponentExample[] = [
  {
    id: 'neutral',
    title: 'Neutral',
    description: 'Información sin connotación de estado.',
    code: '<Badge>New</Badge>',
    render: () => <Badge>New</Badge>,
  },
  {
    id: 'success',
    title: 'Success',
    description: 'Estado positivo; el texto lo dice, el color lo refuerza.',
    code: '<Badge variant="success">Approved</Badge>',
    render: () => <Badge variant="success">Approved</Badge>,
  },
  {
    id: 'warning',
    title: 'Warning',
    description: 'Estado de atención.',
    code: '<Badge variant="warning">Pending</Badge>',
    render: () => <Badge variant="warning">Pending</Badge>,
  },
  {
    id: 'danger',
    title: 'Danger',
    description: 'Estado de error o bloqueo.',
    code: '<Badge variant="danger">Blocked</Badge>',
    render: () => <Badge variant="danger">Blocked</Badge>,
  },
]

export default badgeExamples
