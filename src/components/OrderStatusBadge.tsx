import type { OrderStatus } from '../types/api'
import { StatusPill, type StatusTone } from './StatusPill'

const LABELS: Record<OrderStatus, string> = {
  REQUESTED: 'Requested',
  IN_PROGRESS: 'In progress',
  PURCHASED: 'Purchased',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const TONES: Record<OrderStatus, StatusTone> = {
  REQUESTED: 'idle',
  IN_PROGRESS: 'early',
  PURCHASED: 'mid',
  SENT: 'late',
  DELIVERED: 'done',
  CANCELLED: 'stopped',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusPill tone={TONES[status]} label={LABELS[status]} />
}
