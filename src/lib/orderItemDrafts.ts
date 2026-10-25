import { useState } from 'react'
import type { CreateOrderItemInput, UpdateMyOrderItemInput } from '../api/orders'
import type { UpdateOrderItemInput } from '../api/adminOrders'
import type { InventoryItem, OrderItemDto } from '../types/api'

/** The quantity-bump PATCH (member and admin add-item panels, when re-selecting a catalog item
 *  already on the order) fully replaces an item's content, not just quantity - see
 *  OrderService.applyItemContentEdit on the backend. Carries every other field forward unchanged
 *  so bumping quantity can't silently wipe title/description/maxPrice/link/photo. */
export function preservedContentFields(item: OrderItemDto): Omit<UpdateMyOrderItemInput, 'quantity'> {
  return {
    title: item.title,
    description: item.description ?? undefined,
    imageKey: item.imageKey ?? undefined,
    maxPrice: item.maxPrice ?? undefined,
    link: item.link ?? undefined,
  }
}

/** Same reasoning as preservedContentFields above, for the admin-only status/price/weight PATCH
 *  (OrderService.updateItem on the backend) - QuickStatusSelect, BulkEditBar, and
 *  AdminOrderItemEditDialog all touch a subset of {status, actualPrice, soldPrice, weight} and
 *  must carry the rest forward from the item's current values or that PATCH silently wipes them. */
export function preservedItemFields(item: OrderItemDto): Omit<UpdateOrderItemInput, 'status'> {
  return {
    actualPrice: item.actualPrice ?? undefined,
    soldPrice: item.soldPrice ?? undefined,
    weight: item.weight ?? undefined,
  }
}

/** Shared open/searching/justAdded state machine for an "add item to an existing order" panel -
 *  used identically by the member-facing AddItemForm (order detail page) and the admin equivalent,
 *  which otherwise wire up their own mutations and only differ in that. */
export function useAddItemPanelState() {
  const [open, setOpen] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [searching, setSearching] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  function markAdded() {
    setShowCustomForm(false)
    setJustAdded(true)
  }

  function close() {
    setOpen(false)
    setShowCustomForm(false)
    setJustAdded(false)
  }

  return { open, setOpen, showCustomForm, setShowCustomForm, searching, setSearching, justAdded, setJustAdded, markAdded, close }
}

export interface DraftItem {
  input: CreateOrderItemInput
  displayTitle: string
  imageKey?: string
  isPreorder?: boolean
  expectedReleaseDate?: string | null
}

export function draftFromInventoryItem(item: InventoryItem): DraftItem {
  return {
    // Max price is always EUR - fixed by policy, not a per-item choice.
    input: { inventoryItemId: item.id, currency: 'EUR', quantity: 1 },
    displayTitle: item.title,
    imageKey: item.images[0],
    isPreorder: item.isPreorder,
    expectedReleaseDate: item.expectedReleaseDate,
  }
}
