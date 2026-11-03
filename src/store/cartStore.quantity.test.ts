import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_ITEM_QUANTITY, useCartStore } from './cartStore'

const line = { inventoryItemId: 'a', title: 'Mochi', priceAmount: 500, currency: 'JPY' as const }

const quantityOfLine = () => useCartStore.getState().items[0].quantity

describe('cart quantity domain', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
    useCartStore.getState().addItem(line, 3)
  })

  it.each([
    [0, 1],
    [-5, 1],
    [2.4, 2],
    [2.6, 3],
    [5000, MAX_ITEM_QUANTITY],
  ])('setQuantity(%s) stores %s', (requested, expected) => {
    useCartStore.getState().setQuantity('a', requested)

    expect(quantityOfLine()).toBe(expected)
  })

  it.each([[NaN], [Infinity], [-Infinity]])('setQuantity(%s) leaves the line unchanged', (requested) => {
    useCartStore.getState().setQuantity('a', requested)

    expect(quantityOfLine()).toBe(3)
  })

  it('caps repeated adds at the maximum', () => {
    useCartStore.getState().addItem(line, MAX_ITEM_QUANTITY)

    expect(quantityOfLine()).toBe(MAX_ITEM_QUANTITY)
  })

  it('stores at least one when a new line is added with zero', () => {
    useCartStore.getState().addItem({ ...line, inventoryItemId: 'b' }, 0)

    expect(useCartStore.getState().items[1].quantity).toBe(1)
  })
})
