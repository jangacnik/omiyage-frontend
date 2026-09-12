import type { OrderItemStatus } from '../types/api'

const LABELS: Record<OrderItemStatus, string> = {
  REQUESTED: 'Requested',
  CONFIRMING: 'Confirming',
  BUYING: 'Buying',
  BOUGHT: 'Bought',
  SHIPPED: 'Shipped',
}

const COLORS: Record<OrderItemStatus, string> = {
  REQUESTED: 'bg-stone-light text-ink',
  CONFIRMING: 'bg-amber-100 text-amber-800',
  BUYING: 'bg-sky-100 text-sky-800',
  BOUGHT: 'bg-emerald-100 text-emerald-800',
  SHIPPED: 'bg-violet-100 text-violet-800',
}

export const ORDER_ITEM_STATUSES: OrderItemStatus[] = ['REQUESTED', 'CONFIRMING', 'BUYING', 'BOUGHT', 'SHIPPED']

export function OrderItemStatusBadge({ status }: { status: OrderItemStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}>{LABELS[status]}</span>
  )
}
