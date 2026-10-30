import { ORDER_ITEM_STATUS_LABELS, ORDER_ITEM_STATUS_TONES } from '../lib/orderItemLabels'
import type { OrderItemStatus } from '../types/api'
import { StatusPill } from './StatusPill'

export function OrderItemStatusBadge({ status }: { status: OrderItemStatus }) {
  return <StatusPill tone={ORDER_ITEM_STATUS_TONES[status]} label={ORDER_ITEM_STATUS_LABELS[status]} size="sm" />
}
