import { useEffect, useState } from 'react'
import { useExchangeRate, useSetExchangeRate, useShippingExchangeRate, useSetShippingExchangeRate } from '../../api/exchangeRate'
import { ButtonSpinner, Spinner } from '../../components/Spinner'

function RateForm({
  label,
  hint,
  value,
  isLoading,
  isPending,
  isError,
  isSuccess,
  onSubmit,
}: {
  label: string
  hint: string
  value: number | undefined
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  onSubmit: (value: number) => void
}) {
  const [input, setInput] = useState('')

  useEffect(() => {
    if (value !== undefined) setInput(value.toString())
  }, [value])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number(input)
    if (!input || Number.isNaN(parsed) || parsed <= 0) return
    onSubmit(parsed)
  }

  if (isLoading) return <Spinner label={`Fetching ${label.toLowerCase()}`} />

  return (
    <div>
      <p className="mb-4 text-sm text-ink/60">{hint}</p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1">
          <span className="field-label">{label}</span>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            className="field-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={label}
          />
        </label>
        <button type="submit" className="btn-primary shrink-0 self-end" disabled={isPending}>
          {isPending ? <ButtonSpinner /> : 'Save'}
        </button>
      </form>
      {isError && <p className="error-text mt-2">Could not save the rate.</p>}
      {isSuccess && <p className="mt-2 text-sm text-forest">Saved.</p>}
    </div>
  )
}

export function AdminExchangeRatePage() {
  const itemRate = useExchangeRate()
  const setItemRate = useSetExchangeRate()
  const shippingRate = useShippingExchangeRate()
  const setShippingRate = useSetShippingExchangeRate()

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <RateForm
        label="JPY per EUR"
        hint="Used to convert item bought-prices (always JPY) into EUR for profit bookkeeping."
        value={itemRate.data?.jpyPerEur}
        isLoading={itemRate.isLoading}
        isPending={setItemRate.isPending}
        isError={setItemRate.isError}
        isSuccess={setItemRate.isSuccess}
        onSubmit={(value) => setItemRate.mutate(value)}
      />
      <RateForm
        label="Shipping JPY per EUR"
        hint="Independent rate used only for the customer-facing shipping cost. Set this separately from the item-price rate above."
        value={shippingRate.data?.shippingJpyPerEur}
        isLoading={shippingRate.isLoading}
        isPending={setShippingRate.isPending}
        isError={setShippingRate.isError}
        isSuccess={setShippingRate.isSuccess}
        onSubmit={(value) => setShippingRate.mutate(value)}
      />
    </div>
  )
}
