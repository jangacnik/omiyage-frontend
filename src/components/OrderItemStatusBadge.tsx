import type { OrderItemStatus } from '../types/api'
import { StatusPill, type StatusTone } from './StatusPill'

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  REQUESTED: 'Requested',
  CONFIRMING: 'Confirming',
  BUYING: 'Buying',
  BOUGHT: 'Bought',
  SHIPPED: 'Shipped',
}

const TONES: Record<OrderItemStatus, StatusTone> = {
  REQUESTED: 'idle',
  CONFIRMING: 'early',
  BUYING: 'mid',
  BOUGHT: 'late',
  SHIPPED: 'done',
}

export const ORDER_ITEM_STATUSES: OrderItemStatus[] = ['REQUESTED', 'CONFIRMING', 'BUYING', 'BOUGHT', 'SHIPPED']

export function OrderItemStatusBadge({ status }: { status: OrderItemStatus }) {
  return <StatusPill tone={TONES[status]} label={ORDER_ITEM_STATUS_LABELS[status]} size="sm" />
}
