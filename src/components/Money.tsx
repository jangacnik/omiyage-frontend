import { formatMoney, useCurrencyPreference, useDisplayAmount } from '../lib/currency'
import type { Currency } from '../types/api'

/** Renders `amount` (in `currency`) converted to the viewer's preferred display currency, falling
 *  back to the native amount while the conversion rate is still loading. */
export function Money({ amount, currency }: { amount: number; currency: Currency }) {
  const display = useDisplayAmount(amount, currency)
  if (!display) return <>{formatMoney(amount, currency)}</>
  return <>{formatMoney(display.amount, display.currency)}</>
}

/** For amounts the backend already computed in both currencies (shipping costs, which carry a
 *  hidden markup on the EUR side) - picks the matching pre-computed amount instead of converting
 *  client-side, so the markup can never be bypassed or reverse-engineered by comparing figures. */
export function ShippingCostMoney({ jpy, eur }: { jpy: number; eur: number }) {
  const { displayCurrency } = useCurrencyPreference()
  return <>{displayCurrency === 'JPY' ? formatMoney(jpy, 'JPY') : formatMoney(eur, 'EUR')}</>
}
