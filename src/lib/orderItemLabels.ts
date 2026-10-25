import type { OrderItemStatus } from '../types/api'

export const CONDITION_LABELS: Record<'NEW' | 'USED', string> = { NEW: 'New', USED: 'Used' }

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  REQUESTED: 'Requested',
  CONFIRMING: 'Confirming',
  BUYING: 'Buying',
  BOUGHT: 'Bought',
  SHIPPED: 'Shipped',
}

export const ORDER_ITEM_STATUSES: OrderItemStatus[] = ['REQUESTED', 'CONFIRMING', 'BUYING', 'BOUGHT', 'SHIPPED']
