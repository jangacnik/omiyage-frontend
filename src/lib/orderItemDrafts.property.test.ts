import { describe, expect } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { draftFromInventoryItem, preservedContentFields, preservedItemFields } from './orderItemDrafts'
import type { InventoryItem, OrderItemDto } from '../types/api'

const text = fc.oneof(fc.string(), fc.constant(''), fc.constantFrom('ポケモンカード', '😀 promo', 'é'))
const nullable = <T>(arbitrary: fc.Arbitrary<T>) => fc.option(arbitrary, { nil: null })
const currency = fc.constantFrom('EUR' as const, 'JPY' as const)

const orderItem: fc.Arbitrary<OrderItemDto> = fc.record({
  id: fc.uuid(),
  inventoryItemId: nullable(fc.uuid()),
  title: text,
  description: nullable(text),
  imageKey: nullable(text),
  condition: nullable(fc.constantFrom('NEW' as const, 'USED' as const)),
  currency,
  maxPrice: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
  actualPrice: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
  actualPriceCurrency: nullable(currency),
  weight: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
  status: fc.constantFrom('REQUESTED' as const, 'CONFIRMING' as const, 'BUYING' as const, 'BOUGHT' as const, 'SHIPPED' as const),
  paid: fc.boolean(),
  paidAt: nullable(text),
  link: nullable(text),
  purchasedAt: nullable(text),
  quantity: fc.integer({ min: 1, max: 1000 }),
  isPreorder: fc.boolean(),
  expectedReleaseDate: nullable(text),
  soldPrice: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
  soldPriceCurrency: nullable(currency),
  profit: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
})

const deepFreeze = <T extends object>(value: T): T => Object.freeze(value)

const inventoryItem: fc.Arbitrary<InventoryItem> = fc.record({
  id: fc.uuid(),
  title: text,
  description: nullable(text),
  link: nullable(text),
  condition: fc.constantFrom('NEW' as const, 'USED' as const),
  priceAmount: fc.double({ noNaN: true, noDefaultInfinity: true }),
  currency,
  stockQuantity: fc.nat(),
  status: fc.constantFrom('ACTIVE' as const, 'ARCHIVED' as const),
  images: fc.array(text, { maxLength: 5 }),
  categories: fc.constant([]),
  tags: fc.array(text, { maxLength: 5 }),
  isPreorder: fc.boolean(),
  expectedReleaseDate: nullable(text),
  weight: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
  boughtPrice: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
  profitEur: nullable(fc.double({ noNaN: true, noDefaultInfinity: true })),
})

describe('preservedContentFields', () => {
  test.prop([orderItem])('carries non-null source fields unchanged', (item) => {
    const patch = preservedContentFields(item)
    expect(patch.title).toBe(item.title)
    for (const field of ['description', 'imageKey', 'maxPrice', 'link'] as const) {
      if (item[field] !== null) expect(patch[field]).toBe(item[field])
    }
  })

  test.prop([orderItem])('turns null source fields into undefined, never null or empty string', (item) => {
    const patch = preservedContentFields(item)
    for (const field of ['description', 'imageKey', 'maxPrice', 'link'] as const) {
      if (item[field] === null) expect(patch[field]).toBeUndefined()
    }
  })

  test.prop([orderItem, fc.integer({ min: 1, max: 1000 })])(
    'applied over a fully populated item changes only quantity',
    (item, quantity) => {
      const full = { ...item, description: item.description ?? 'd', imageKey: item.imageKey ?? 'k', maxPrice: item.maxPrice ?? 1, link: item.link ?? 'l' }
      expect({ ...full, ...preservedContentFields(full), quantity }).toEqual({ ...full, quantity })
    },
  )

  test.prop([orderItem])('does not mutate its input', (item) => {
    const frozen = deepFreeze(structuredClone(item))
    expect(() => preservedContentFields(frozen)).not.toThrow()
    expect(frozen).toEqual(item)
  })
})

describe('preservedItemFields', () => {
  test.prop([orderItem])('carries non-null price and weight fields, drops nulls to undefined', (item) => {
    const patch = preservedItemFields(item)
    for (const field of ['actualPrice', 'soldPrice', 'weight'] as const) {
      if (item[field] === null) expect(patch[field]).toBeUndefined()
      else expect(patch[field]).toBe(item[field])
    }
  })

  test.prop([orderItem])('does not mutate its input', (item) => {
    const frozen = deepFreeze(structuredClone(item))
    expect(() => preservedItemFields(frozen)).not.toThrow()
    expect(frozen).toEqual(item)
  })
})

describe('draftFromInventoryItem', () => {
  test.prop([inventoryItem])('always requests one item in EUR and uses the first image', (item) => {
    const draft = draftFromInventoryItem(item)
    expect(draft.input).toEqual({ inventoryItemId: item.id, currency: 'EUR', quantity: 1 })
    expect(draft.imageKey).toBe(item.images[0])
    expect(draft.displayTitle).toBe(item.title)
  })
})
