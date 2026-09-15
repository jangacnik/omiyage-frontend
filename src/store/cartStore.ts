import { create } from 'zustand'
import type { Currency } from '../types/api'

const STORAGE_KEY = 'omiyage.cart'

export interface CartItem {
  inventoryItemId: string
  title: string
  imageKey?: string
  priceAmount: number
  currency: Currency
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (inventoryItemId: string) => void
  setQuantity: (inventoryItemId: string, quantity: number) => void
  clear: () => void
}

function loadInitialItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
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
