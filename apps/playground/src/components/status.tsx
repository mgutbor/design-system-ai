import { Badge, type BadgeVariant } from '@ods-ai/react'
import type { Appointment } from '../data/fixtures'

const STATUS_META: Record<Appointment['status'], { label: string; variant: BadgeVariant }> = {
  confirmed: { label: 'Confirmada', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
}

export function statusLabel(status: Appointment['status']): string {
  return STATUS_META[status].label
}

export function StatusBadge({ status }: { status: Appointment['status'] }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
