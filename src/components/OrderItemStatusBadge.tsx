import { ORDER_ITEM_STATUS_LABELS } from '../lib/orderItemLabels'
import type { OrderItemStatus } from '../types/api'
import { StatusPill, type StatusTone } from './StatusPill'

const TONES: Record<OrderItemStatus, StatusTone> = {
  REQUESTED: 'idle',
  CONFIRMING: 'early',
  BUYING: 'mid',
  BOUGHT: 'late',
  SHIPPED: 'done',
}

export function OrderItemStatusBadge({ status }: { status: OrderItemStatus }) {
  return <StatusPill tone={TONES[status]} label={ORDER_ITEM_STATUS_LABELS[status]} size="sm" />
}
