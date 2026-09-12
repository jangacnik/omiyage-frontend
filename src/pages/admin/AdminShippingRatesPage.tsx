import { useState } from 'react'
import {
  useCreateShippingRate,
  useDeleteShippingRate,
  useShippingRates,
  useUpdateShippingRate,
  type ShippingRateInput,
} from '../../api/adminShippingRates'
import { Spinner } from '../../components/Spinner'
import { useConfirm } from '../../components/ConfirmDialog'
import { TrashIcon } from '../../components/icons'
import { ApiError } from '../../lib/apiClient'
import type { ShipmentDestination, ShippingMethod, ShippingRateDto } from '../../types/api'

const DESTINATIONS: ShipmentDestination[] = ['SLOVENIA', 'AUSTRIA']
const SHIPPING_METHODS: ShippingMethod[] = ['EMS', 'SMALL_PACKET', 'SURFACE_MAIL']
const METHOD_LABELS: Record<ShippingMethod, string> = {
  EMS: 'EMS',
  SMALL_PACKET: 'Small Packet (air, up to 2kg)',
  SURFACE_MAIL: 'Surface Mail (up to 2kg)',
}

function destinationLabel(destination: ShipmentDestination): string {
  return destination[0] + destination.slice(1).toLowerCase()
}

function formatGrams(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`
}

function formatJpy(amount: number): string {
  return `¥${amount.toLocaleString('en-US')}`
}

function errorMessageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
}

interface NewRateForm {
  destination: ShipmentDestination
  shippingMethod: ShippingMethod
  maxWeightGrams: string
  costJpy: string
  estimatedDays: string
}

const emptyForm: NewRateForm = {
  destination: 'SLOVENIA',
  shippingMethod: 'EMS',
  maxWeightGrams: '',
  costJpy: '',
  estimatedDays: '',
}

function RateRow({ rate }: { rate: ShippingRateDto }) {
  const updateRate = useUpdateShippingRate()
  const deleteRate = useDeleteShippingRate()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [maxWeightGrams, setMaxWeightGrams] = useState(String(rate.maxWeightGrams))
  const [costJpy, setCostJpy] = useState(String(rate.costJpy))
  const [estimatedDays, setEstimatedDays] = useState(String(rate.estimatedDays))
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setMaxWeightGrams(String(rate.maxWeightGrams))
    setCostJpy(String(rate.costJpy))
    setEstimatedDays(String(rate.estimatedDays))
    setError(null)
    setEditing(true)
  }

  function handleSave() {
    const input: ShippingRateInput = {
      destination: rate.destination,
      shippingMethod: rate.shippingMethod,
      maxWeightGrams: Number(maxWeightGrams),
      costJpy: Number(costJpy),
      estimatedDays: Number(estimatedDays),
    }
    updateRate.mutate(
      { id: rate.id, ...input },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setError(errorMessageOf(err)),
      },
    )
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete rate',
      message: `Delete the ${METHOD_LABELS[rate.shippingMethod]} rate up to ${formatGrams(rate.maxWeightGrams)}?`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteRate.mutate(rate.id)
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={maxWeightGrams}
            onChange={(e) => setMaxWeightGrams(e.target.value)}
            aria-label={`Max weight grams for rate ${rate.id}`}
            className="field-input w-24 py-1 text-sm"
          />
          <span className="text-xs text-ink/50">g</span>
          <input
            type="number"
            value={costJpy}
            onChange={(e) => setCostJpy(e.target.value)}
            aria-label={`Cost JPY for rate ${rate.id}`}
            className="field-input w-24 py-1 text-sm"
          />
          <span className="text-xs text-ink/50">JPY</span>
          <input
            type="number"
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
            aria-label={`Estimated days for rate ${rate.id}`}
            className="field-input w-20 py-1 text-sm"
          />
          <span className="text-xs text-ink/50">days</span>
          <button
            type="button"
            className="btn-primary px-2 py-1 text-xs"
            onClick={handleSave}
            disabled={updateRate.isPending}
          >
            Save
          </button>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between py-2">
      <span className="text-sm text-ink/80">
        up to {formatGrams(rate.maxWeightGrams)} — {formatJpy(rate.costJpy)} — ~{rate.estimatedDays} days
      </span>
      <span className="flex gap-2">
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={startEdit}>
          Edit
        </button>
        <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={handleDelete}>
          <TrashIcon size={13} /> Delete
        </button>
      </span>
    </li>
  )
}

export function AdminShippingRatesPage() {
  const { data: rates, isLoading } = useShippingRates()
  const createRate = useCreateShippingRate()
  const [form, setForm] = useState<NewRateForm>(emptyForm)
  const [createError, setCreateError] = useState<string | null>(null)

  function updateField<K extends keyof NewRateForm>(key: K, value: NewRateForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    createRate.mutate(
      {
        destination: form.destination,
        shippingMethod: form.shippingMethod,
        maxWeightGrams: Number(form.maxWeightGrams),
        costJpy: Number(form.costJpy),
        estimatedDays: Number(form.estimatedDays),
      },
      {
        onSuccess: () => setForm(emptyForm),
        onError: (err) => setCreateError(errorMessageOf(err)),
      },
    )
  }

  const groups = DESTINATIONS.map((destination) => ({
    destination,
    methods: SHIPPING_METHODS.map((shippingMethod) => ({
      shippingMethod,
      rates: rates?.filter((r) => r.destination === destination && r.shippingMethod === shippingMethod) ?? [],
    })).filter((m) => m.rates.length > 0),
  })).filter((g) => g.methods.length > 0)

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-4">Admin: Shipping Rates</h1>

      <form onSubmit={handleCreate} className="card mb-6 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={form.destination}
            onChange={(e) => updateField('destination', e.target.value as ShipmentDestination)}
            aria-label="Destination"
            className="field-input"
          >
            {DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {destinationLabel(d)}
              </option>
            ))}
          </select>
          <select
            value={form.shippingMethod}
            onChange={(e) => updateField('shippingMethod', e.target.value as ShippingMethod)}
            aria-label="Shipping method"
            className="field-input"
          >
            {SHIPPING_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="number"
            placeholder="Max weight (g)"
            value={form.maxWeightGrams}
            onChange={(e) => updateField('maxWeightGrams', e.target.value)}
            aria-label="Max weight grams"
            className="field-input"
          />
          <input
            type="number"
            placeholder="Cost (JPY)"
            value={form.costJpy}
            onChange={(e) => updateField('costJpy', e.target.value)}
            aria-label="Cost JPY"
            className="field-input"
          />
          <input
            type="number"
            placeholder="Estimated days"
            value={form.estimatedDays}
            onChange={(e) => updateField('estimatedDays', e.target.value)}
            aria-label="Estimated days"
            className="field-input"
          />
        </div>
        <button type="submit" className="btn-primary self-start" disabled={createRate.isPending}>
          Add rate
        </button>
        {createError && <p className="error-text">{createError}</p>}
      </form>

      {isLoading && <Spinner label="Fetching shipping rates" />}

      {!isLoading && groups.length === 0 && <p className="text-ink/50">No shipping rates configured yet.</p>}

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.destination}>
            <h2 className="mb-2 text-lg font-medium text-ink">{destinationLabel(group.destination)}</h2>
            <div className="flex flex-col gap-4">
              {group.methods.map((method) => (
                <div key={method.shippingMethod} className="card">
                  <h3 className="mb-1 text-sm font-medium text-forest">{METHOD_LABELS[method.shippingMethod]}</h3>
                  <ul className="flex flex-col divide-y divide-mist">
                    {method.rates.map((rate) => (
                      <RateRow key={rate.id} rate={rate} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
