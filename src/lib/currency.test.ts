import { describe, expect } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { formatGrams, formatMoney } from './currency'

const parseAmount = (formatted: string) => Number(formatted.replace(/[^0-9.-]/g, ''))

describe('formatGrams', () => {
  test.prop([fc.integer({ min: 0, max: 999 })])('whole grams below 1000 render as grams', (grams) => {
    expect(formatGrams(grams)).toBe(`${grams} g`)
  })

  test.prop([fc.integer({ min: 1000, max: 10_000_000 })])('from 1000 g renders kg within 5 g of input', (grams) => {
    const formatted = formatGrams(grams)
    expect(formatted).toMatch(/^\d+\.\d{2} kg$/)
    expect(Math.abs(parseFloat(formatted) * 1000 - grams)).toBeLessThanOrEqual(5)
  })

  test.prop([fc.oneof(fc.double({ noDefaultInfinity: false }), fc.integer())])('never throws', (grams) => {
    expect(() => formatGrams(grams)).not.toThrow()
  })

  test('pins the 999/1000 boundary', () => {
    expect(formatGrams(999)).toBe('999 g')
    expect(formatGrams(1000)).toBe('1.00 kg')
  })
})

describe('formatMoney', () => {
  const cents = fc.integer({ min: -100_000_000_000, max: 100_000_000_000 })

  test.prop([cents])('EUR has exactly two decimals and keeps the cents', (amountCents) => {
    const formatted = formatMoney(amountCents / 100, 'EUR')
    expect(formatted).toMatch(/\.\d{2}$/)
    expect(Math.round(parseAmount(formatted) * 100)).toBe(amountCents)
  })

  test.prop([fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 })])(
    'JPY has no decimals and keeps the amount',
    (yen) => {
      const formatted = formatMoney(yen, 'JPY')
      expect(formatted).not.toContain('.')
      expect(parseAmount(formatted)).toBe(yen)
    },
  )

  test.prop([cents, fc.constantFrom('EUR' as const, 'JPY' as const)])('sign is preserved', (amountCents, currency) => {
    const amount = currency === 'EUR' ? amountCents / 100 : Math.trunc(amountCents / 100)
    const formatted = formatMoney(amount, currency)
    expect(formatted.startsWith('-')).toBe(amount < 0)
  })

  test.prop([fc.double({ noNaN: true, noDefaultInfinity: true }), fc.constantFrom('EUR' as const, 'JPY' as const)])(
    'never throws for finite numbers',
    (amount, currency) => {
      expect(() => formatMoney(amount, currency)).not.toThrow()
    },
  )

  test('large amounts keep thousands grouping', () => {
    expect(formatMoney(1_000_000_000, 'EUR')).toBe('€1,000,000,000.00')
  })

  test.prop([
    fc.array(fc.record({ priceCents: fc.integer({ min: 0, max: 10_000_000 }), quantity: fc.integer({ min: 1, max: 1000 }) }), {
      maxLength: 50,
    }),
  ])('sum-then-format equals format-then-sum within 0.01', (lines) => {
    const sumThenFormat = parseAmount(
      formatMoney(lines.reduce((total, line) => total + (line.priceCents / 100) * line.quantity, 0), 'EUR'),
    )
    const formatThenSum = lines.reduce(
      (total, line) => total + parseAmount(formatMoney((line.priceCents / 100) * line.quantity, 'EUR')),
      0,
    )
    expect(Math.abs(sumThenFormat - formatThenSum)).toBeLessThanOrEqual(0.01)
  })
})
