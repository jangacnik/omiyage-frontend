import type { OrderStatus } from '../types/api'

const LABELS: Record<OrderStatus, string> = {
  REQUESTED: 'Requested',
  IN_PROGRESS: 'In progress',
  PURCHASED: 'Purchased',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const COLORS: Record<OrderStatus, string> = {
  REQUESTED: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  PURCHASED: 'bg-sky-100 text-sky-800',
  SENT: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-700',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${COLORS[status]}`}>{LABELS[status]}</span>
  )
}
