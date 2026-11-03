import { beforeEach, describe, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { cartItemCount, useCartStore } from './cartStore'
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
      model.set(cmd.item.inventoryItemId, { ...cmd.item, quantity: (existing?.quantity ?? 0) + cmd.quantity })
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

const corruptLine = fc.record(
  {
    inventoryItemId: fc.oneof(fc.string(), fc.integer()),
    title: fc.oneof(fc.string(), fc.constant(null)),
    priceAmount: fc.oneof(fc.integer(), fc.string()),
    currency: fc.constantFrom('EUR', 'JPY', 'USD'),
    quantity: fc.oneof(fc.integer(), fc.double(), fc.constant(null)),
  },
  { requiredKeys: [] },
)

const line: Snapshot = { inventoryItemId: 'a', title: 'Mochi', priceAmount: 100, currency: 'JPY' }

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
    'adding the same id twice sums quantities and the latest snapshot wins',
    (first, second, firstQuantity, secondQuantity) => {
      localStorage.clear()
      useCartStore.setState({ items: [] })
      const latest = { ...second, inventoryItemId: first.inventoryItemId }

      useCartStore.getState().addItem(first, firstQuantity)
      useCartStore.getState().addItem(latest, secondQuantity)

      expect(useCartStore.getState().items).toEqual([{ ...latest, quantity: firstQuantity + secondQuantity }])
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

    // Until the store caps adds itself (#87), a summed line can pass 1000; loading drops it.
    expect(reloaded.useCartStore.getState().items).toEqual(items.filter((item) => item.quantity <= 1000))
  })

  test.prop([fc.oneof(fc.jsonValue(), fc.array(corruptLine))])('corrupt storage always yields well-formed lines', async (stored) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    vi.resetModules()
    const reloaded = await import('./cartStore')
    const items = reloaded.useCartStore.getState().items

    expect(Array.isArray(items)).toBe(true)
    for (const item of items) {
      expect(item).toEqual(expect.objectContaining({ inventoryItemId: expect.any(String), title: expect.any(String) }))
      expect(Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 1000).toBe(true)
    }
    expect(new Set(items.map((item) => item.inventoryItemId)).size).toBe(items.length)
    expect(() => reloaded.useCartStore.getState().addItem(line)).not.toThrow()
  })
})
