import type { OrderStatus } from '../types/api'

const LABELS: Record<OrderStatus, string> = {
  REQUESTED: 'Requested',
  IN_PROGRESS: 'In progress',
  PURCHASED: 'Purchased',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className="inline-block border border-gray-300 px-2 py-0.5 text-sm">{LABELS[status]}</span>
}
