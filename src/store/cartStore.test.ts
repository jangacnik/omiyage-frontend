import { beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'omiyage.cart'
const validLine = { inventoryItemId: 'a', title: 'Mochi', priceAmount: 500, currency: 'JPY', quantity: 2 }

async function storeLoadedFrom(raw: string) {
  localStorage.setItem(STORAGE_KEY, raw)
  vi.resetModules()
  return (await import('./cartStore')).useCartStore
}

describe('cart store initial load', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.each(['{}', 'null', '"x"', '[1,2]', 'not json'])('starts empty from stored %s', async (raw) => {
    const store = await storeLoadedFrom(raw)

    expect(store.getState().items).toEqual([])
  })

  it('stays usable after loading a stored object', async () => {
    const store = await storeLoadedFrom('{}')

    store.getState().addItem({ ...validLine, currency: 'JPY' })

    expect(store.getState().items).toHaveLength(1)
  })

  it('keeps a valid line with its optional fields', async () => {
    const line = { ...validLine, imageKey: 'k', isPreorder: true, expectedReleaseDate: null, stockQuantity: 3 }

    const store = await storeLoadedFrom(JSON.stringify([line]))

    expect(store.getState().items).toEqual([line])
  })

  it.each([
    ['missing id', { ...validLine, inventoryItemId: undefined }],
    ['missing title', { ...validLine, title: undefined }],
    ['non-numeric price', { ...validLine, priceAmount: '500' }],
    ['unknown currency', { ...validLine, currency: 'USD' }],
    ['zero quantity', { ...validLine, quantity: 0 }],
    ['negative quantity', { ...validLine, quantity: -1 }],
    ['fractional quantity', { ...validLine, quantity: 1.5 }],
    ['null quantity (stored NaN)', { ...validLine, quantity: null }],
    ['quantity above the backend maximum', { ...validLine, quantity: 1001 }],
  ])('drops a line with %s and keeps the rest', async (_name, bad) => {
    const store = await storeLoadedFrom(JSON.stringify([bad, validLine]))

    expect(store.getState().items).toEqual([validLine])
  })

  it('keeps a line at the backend maximum', async () => {
    const store = await storeLoadedFrom(JSON.stringify([{ ...validLine, quantity: 1000 }]))

    expect(store.getState().items).toEqual([{ ...validLine, quantity: 1000 }])
  })

  it('keeps only the first line for a duplicated item id', async () => {
    const duplicate = { ...validLine, title: 'Mochi again', quantity: 5 }

    const store = await storeLoadedFrom(JSON.stringify([validLine, duplicate]))

    expect(store.getState().items).toEqual([validLine])
  })
})
