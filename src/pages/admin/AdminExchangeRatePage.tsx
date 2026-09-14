import { useEffect, useState } from 'react'
import { useExchangeRate, useSetExchangeRate } from '../../api/exchangeRate'
import { ButtonSpinner, Spinner } from '../../components/Spinner'

/** The one JPY/EUR rate the whole app converts against - admin's own bought-price bookkeeping
 *  and (with a separate hidden markup) customer-facing shipping cost both key off this same
 *  number. See ExchangeRateService on the backend. */
export function AdminExchangeRatePage() {
  const { data, isLoading } = useExchangeRate()
  const setRate = useSetExchangeRate()
  const [jpyPerEur, setJpyPerEur] = useState('')

  useEffect(() => {
    if (data) setJpyPerEur(data.jpyPerEur.toString())
  }, [data])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(jpyPerEur)
    if (!jpyPerEur || Number.isNaN(value) || value <= 0) return
    setRate.mutate(value)
  }

  if (isLoading) return <Spinner label="Fetching exchange rate" />

  return (
    <div className="mx-auto max-w-md">
      <p className="mb-4 text-sm text-ink/60">
        Used to convert item bought-prices (always JPY) into EUR for profit bookkeeping, and as the base rate for the
        customer-facing shipping cost.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1">
          <span className="field-label">JPY per EUR</span>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            className="field-input"
            value={jpyPerEur}
            onChange={(e) => setJpyPerEur(e.target.value)}
            aria-label="JPY per EUR"
          />
        </label>
        <button type="submit" className="btn-primary shrink-0 self-end" disabled={setRate.isPending}>
          {setRate.isPending ? <ButtonSpinner /> : 'Save'}
        </button>
      </form>
      {setRate.isError && <p className="error-text mt-2">Could not save the exchange rate.</p>}
      {setRate.isSuccess && <p className="mt-2 text-sm text-forest">Saved.</p>}
    </div>
  )
}
