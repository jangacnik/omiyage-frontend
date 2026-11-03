import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import type { Currency, InventoryItem } from '../types/api'

const STORAGE_KEY = 'omiyage.cart'
// Backend MAX_ITEM_QUANTITY (OrderDtos.kt); a larger stored line would fail at checkout.
const MAX_STORED_QUANTITY = 1000

export interface CartItem {
  inventoryItemId: string
  title: string
  imageKey?: string
  priceAmount: number
  currency: Currency
  quantity: number
  isPreorder?: boolean
  expectedReleaseDate?: string | null
  // Stock at add-time, for a soft "more than we have" nudge in the cart - never blocks checkout,
  // since a 0-or-low-stock item is still requestable (see OrderService.buildOrderItem on the
  // backend), it's just a signal the admin will need to restock/rebuy.
  stockQuantity?: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (inventoryItemId: string) => void
  setQuantity: (inventoryItemId: string, quantity: number) => void
  clear: () => void
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const { inventoryItemId, title, priceAmount, currency, quantity } = value as Record<string, unknown>
  return (
    typeof inventoryItemId === 'string' &&
    typeof title === 'string' &&
    Number.isFinite(priceAmount) &&
    (currency === 'EUR' || currency === 'JPY') &&
    Number.isInteger(quantity) &&
    (quantity as number) >= 1 &&
    (quantity as number) <= MAX_STORED_QUANTITY
  )
}

function loadInitialItems(): CartItem[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(stored)) return []
    const seen = new Set<string>()
    return stored.filter(isCartItem).filter((item) => !seen.has(item.inventoryItemId) && seen.add(item.inventoryItemId))
  } catch {
    return []
  }
}

function persist(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useCartStore = create<CartState>((set, get) => ({
  items: loadInitialItems(),
  addItem: (item, quantity = 1) => {
    const items = get().items
    const existing = items.find((i) => i.inventoryItemId === item.inventoryItemId)
    // Refresh title/price/image from this call's snapshot even for an existing line - the cart can
    // persist across sessions in localStorage, so a re-add is also how a stale catalog price gets
    // corrected instead of quietly carrying the amount captured on the very first add.
    const next = existing
      ? items.map((i) =>
          i.inventoryItemId === item.inventoryItemId ? { ...item, quantity: i.quantity + quantity } : i,
        )
      : [...items, { ...item, quantity }]
    persist(next)
    set({ items: next })
  },
  removeItem: (inventoryItemId) => {
    const next = get().items.filter((i) => i.inventoryItemId !== inventoryItemId)
    persist(next)
    set({ items: next })
  },
  setQuantity: (inventoryItemId, quantity) => {
    const next = get().items.map((i) => (i.inventoryItemId === inventoryItemId ? { ...i, quantity } : i))
    persist(next)
    set({ items: next })
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ items: [] })
  },
}))

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/** Shared by every "Add to cart" call site (InventoryCard, InventoryDetailPage) so the fields sent
 *  to addItem() can't drift between them. */
export function cartItemFromInventoryItem(item: InventoryItem): Omit<CartItem, 'quantity'> {
  return {
    inventoryItemId: item.id,
    title: item.title,
    imageKey: item.images[0],
    priceAmount: item.priceAmount,
    currency: item.currency,
    isPreorder: item.isPreorder,
    expectedReleaseDate: item.expectedReleaseDate,
    stockQuantity: item.stockQuantity,
  }
}

/** Transient "added" state for an Add to cart button - self-clearing, no setup beyond calling
 *  `announce()` in the click handler alongside the actual `addItem` call. */
export function useAddToCartFeedback() {
  const [justAdded, setJustAdded] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function announce() {
    clearTimeout(timeoutRef.current)
    setJustAdded(true)
    timeoutRef.current = setTimeout(() => setJustAdded(false), 1800)
  }

  return { justAdded, announce }
}
