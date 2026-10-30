import type { StatusTone } from '../components/StatusPill'
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

export const ORDER_ITEM_STATUS_TONES: Record<OrderItemStatus, StatusTone> = {
  REQUESTED: 'idle',
  CONFIRMING: 'early',
  BUYING: 'mid',
  BOUGHT: 'late',
  SHIPPED: 'done',
}

export const ORDER_ITEM_STATUS_OPTIONS = ORDER_ITEM_STATUSES.map((value) => ({
  value,
  label: ORDER_ITEM_STATUS_LABELS[value],
  tone: ORDER_ITEM_STATUS_TONES[value],
}))
