import { beforeEach, describe, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { MAX_ITEM_QUANTITY, cartItemCount, useCartStore } from './cartStore'
import type { CartItem } from './cartStore'

const STORAGE_KEY = 'omiyage.cart'

type Snapshot = Omit<CartItem, 'quantity'>

const snapshot: fc.Arbitrary<Snapshot> = fc.record({
  inventoryItemId: fc.constantFrom('a', 'b', 'c', 'd'),
  title: fc.string(),
  priceAmount: fc.integer({ min: 0, max: 1_000_000 }),
  currency: fc.constantFrom('EUR' as const, 'JPY' as const),
})

const quantity = fc.integer({ min: 1, max: 1000 })

type Command =
  | { type: 'add'; item: Snapshot; quantity: number }
  | { type: 'remove'; id: string }
  | { type: 'setQuantity'; id: string; quantity: number }
  | { type: 'clear' }

const id = fc.constantFrom('a', 'b', 'c', 'd', 'missing')

const command: fc.Arbitrary<Command> = fc.oneof(
  fc.record({ type: fc.constant('add' as const), item: snapshot, quantity }),
  fc.record({ type: fc.constant('remove' as const), id }),
  fc.record({ type: fc.constant('setQuantity' as const), id, quantity }),
  fc.record({ type: fc.constant('clear' as const) }),
)

function applyToModel(model: Map<string, CartItem>, cmd: Command) {
  switch (cmd.type) {
    case 'add': {
      const existing = model.get(cmd.item.inventoryItemId)
      if (existing && existing.quantity >= MAX_ITEM_QUANTITY) break
      const total = (existing?.quantity ?? 0) + cmd.quantity
      model.set(cmd.item.inventoryItemId, { ...cmd.item, quantity: Math.min(MAX_ITEM_QUANTITY, total) })
      break
    }
    case 'remove':
      model.delete(cmd.id)
      break
    case 'setQuantity': {
      const existing = model.get(cmd.id)
      if (existing) model.set(cmd.id, { ...existing, quantity: cmd.quantity })
      break
    }
    case 'clear':
      model.clear()
      break
  }
}

function applyToStore(cmd: Command) {
  const store = useCartStore.getState()
  switch (cmd.type) {
    case 'add':
      store.addItem(cmd.item, cmd.quantity)
      break
    case 'remove':
      store.removeItem(cmd.id)
      break
    case 'setQuantity':
      store.setQuantity(cmd.id, cmd.quantity)
      break
    case 'clear':
      store.clear()
      break
  }
}

const storedItems = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')

describe('cart store', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
  })

  test.prop([fc.array(command, { maxLength: 40 })])('matches a Map model after every command', (commands) => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
    const model = new Map<string, CartItem>()

    for (const cmd of commands) {
      applyToModel(model, cmd)
      applyToStore(cmd)

      const items = useCartStore.getState().items
      expect(items).toEqual([...model.values()])
      expect(new Set(items.map((item) => item.inventoryItemId)).size).toBe(items.length)
      expect(cartItemCount(items)).toBe(items.reduce((sum, item) => sum + item.quantity, 0))
      expect(storedItems()).toEqual(items)
    }
  })

  test.prop([snapshot, snapshot, quantity, quantity])(
    'adding the same id twice sums quantities up to the cap and the latest snapshot wins unless the line was full',
    (first, second, firstQuantity, secondQuantity) => {
      localStorage.clear()
      useCartStore.setState({ items: [] })
      const latest = { ...second, inventoryItemId: first.inventoryItemId }

      useCartStore.getState().addItem(first, firstQuantity)
      useCartStore.getState().addItem(latest, secondQuantity)

      const expected =
        firstQuantity >= MAX_ITEM_QUANTITY
          ? { ...first, quantity: MAX_ITEM_QUANTITY }
          : { ...latest, quantity: Math.min(MAX_ITEM_QUANTITY, firstQuantity + secondQuantity) }
      expect(useCartStore.getState().items).toEqual([expected])
    },
  )

  test.prop([fc.array(command, { maxLength: 20 }), snapshot, quantity])(
    'adding a new line then removing it restores the previous items',
    (commands, item, itemQuantity) => {
      localStorage.clear()
      useCartStore.setState({ items: [] })
      commands.forEach(applyToStore)
      useCartStore.getState().removeItem('fresh')
      const before = useCartStore.getState().items

      useCartStore.getState().addItem({ ...item, inventoryItemId: 'fresh' }, itemQuantity)
      useCartStore.getState().removeItem('fresh')

      expect(useCartStore.getState().items).toEqual(before)
    },
  )

  test.prop([fc.array(command, { maxLength: 20 })])('a store created from the persisted cart has the same items', async (commands) => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
    commands.forEach(applyToStore)
    const items = useCartStore.getState().items

    vi.resetModules()
    const reloaded = await import('./cartStore')

    expect(reloaded.useCartStore.getState().items).toEqual(items)
  })

  test.prop([snapshot, fc.oneof(fc.double(), fc.integer())])(
    'setQuantity keeps every quantity an integer in 1..MAX_ITEM_QUANTITY',
    (item, requested) => {
      localStorage.clear()
      useCartStore.setState({ items: [] })
      useCartStore.getState().addItem(item, 2)

      useCartStore.getState().setQuantity(item.inventoryItemId, requested)

      const stored = useCartStore.getState().items[0].quantity
      expect(Number.isInteger(stored) && stored >= 1 && stored <= MAX_ITEM_QUANTITY).toBe(true)
    },
  )
})
