import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { api } from './apiClient'
import type { Currency, ExchangeRateDto } from '../types/api'

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatGrams(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`
}

const STORAGE_KEY = 'omiyage.displayCurrency'

function readStoredCurrency(): Currency {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'EUR' || stored === 'JPY' ? stored : 'JPY'
  } catch {
    return 'JPY'
  }
}

interface CurrencyPreferenceValue {
  displayCurrency: Currency
  setDisplayCurrency: (currency: Currency) => void
}

const CurrencyPreferenceContext = createContext<CurrencyPreferenceValue | null>(null)

export function CurrencyPreferenceProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>(readStoredCurrency)

  function setDisplayCurrency(currency: Currency) {
    setDisplayCurrencyState(currency)
    try {
      localStorage.setItem(STORAGE_KEY, currency)
    } catch {
      // best-effort persistence only - the toggle still works for the rest of this session
    }
  }

  return (
    <CurrencyPreferenceContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </CurrencyPreferenceContext.Provider>
  )
}

export function useCurrencyPreference(): CurrencyPreferenceValue {
  const value = useContext(CurrencyPreferenceContext)
  if (!value) throw new Error('useCurrencyPreference must be used within a CurrencyPreferenceProvider')
  return value
}

export function useExchangeRate() {
  return useQuery({
    queryKey: ['exchange-rate'],
    queryFn: () => api.get<ExchangeRateDto>('/api/exchange-rate'),
    staleTime: 60 * 60 * 1000,
  })
}

/** Converts `amount` (in `nativeCurrency`) to the viewer's preferred display currency - a plain,
 *  no-markup conversion for display only (the shipping-cost markup is applied server-side and
 *  never redone here). Returns null while the rate is still loading and a conversion is needed. */
export function useDisplayAmount(amount: number, nativeCurrency: Currency): { amount: number; currency: Currency } | null {
  const { displayCurrency } = useCurrencyPreference()
  const { data: rate } = useExchangeRate()

  if (displayCurrency === nativeCurrency) {
    return { amount, currency: nativeCurrency }
  }
  if (!rate) return null

  const converted = nativeCurrency === 'JPY' ? amount / rate.jpyPerEur : amount * rate.jpyPerEur
  return { amount: converted, currency: displayCurrency }
}
