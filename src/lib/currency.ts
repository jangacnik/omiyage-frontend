import type { Currency } from '../types/api'

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatGrams(grams: number): string {
  const tenthsOfGram = Math.round(grams * 10) / 10
  if (tenthsOfGram < 10) return `${tenthsOfGram} g`
  const wholeGrams = Math.round(grams)
  return wholeGrams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${wholeGrams} g`
}
