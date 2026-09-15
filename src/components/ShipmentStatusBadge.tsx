import type { ShipmentStatus } from '../types/api'
import { StatusPill, type StatusTone } from './StatusPill'

const LABELS: Record<ShipmentStatus, string> = {
  PREPARING: 'Preparing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
}

const TONES: Record<ShipmentStatus, StatusTone> = {
  PREPARING: 'mid',
  SHIPPED: 'late',
  DELIVERED: 'done',
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return <StatusPill tone={TONES[status]} label={LABELS[status]} />
}
