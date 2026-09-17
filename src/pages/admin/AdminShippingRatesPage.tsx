import { useState } from 'react'
import {
  useCreateShippingRate,
  useDeleteShippingRate,
  useShippingRates,
  useUpdateShippingRate,
  type ShippingRateInput,
} from '../../api/adminShippingRates'
import { Field } from '../../components/Field'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { useConfirm } from '../../components/ConfirmDialog'
import { IconButton } from '../../components/IconButton'
import { CheckIcon, CloseIcon, EditIcon, TrashIcon } from '../../components/icons'
import { errorMessage } from '../../lib/apiClient'
import { formatGrams, formatMoney } from '../../lib/currency'
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

function errorMessageOf(error: unknown): string {
  return errorMessage(error, 'Something went wrong. Please try again.')
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
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Max weight" hint="Grams" className="w-24">
            <input
              type="number"
              value={maxWeightGrams}
              onChange={(e) => setMaxWeightGrams(e.target.value)}
              aria-label={`Max weight grams for rate ${rate.id}`}
              className="field-input py-1 text-sm"
            />
          </Field>
          <Field label="Cost" hint="JPY" className="w-24">
            <input
              type="number"
              value={costJpy}
              onChange={(e) => setCostJpy(e.target.value)}
              aria-label={`Cost JPY for rate ${rate.id}`}
              className="field-input py-1 text-sm"
            />
          </Field>
          <Field label="Days" hint="Estimated" className="w-20">
            <input
              type="number"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              aria-label={`Estimated days for rate ${rate.id}`}
              className="field-input py-1 text-sm"
            />
          </Field>
          <IconButton
            variant="primary"
            label="Save"
            onClick={handleSave}
            disabled={updateRate.isPending}
            icon={updateRate.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
          />
          <IconButton label="Cancel" onClick={() => setEditing(false)} icon={<CloseIcon size={14} />} />
        </div>
        {error && <p className="error-text">{error}</p>}
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between py-2">
      <span className="text-sm text-ink/80">
        up to {formatGrams(rate.maxWeightGrams)} — {formatMoney(rate.costJpy, 'JPY')} — ~{rate.estimatedDays} days
      </span>
      <span className="flex gap-2">
        <IconButton label="Edit" onClick={startEdit} icon={<EditIcon size={14} />} />
        <IconButton variant="danger" label="Delete" onClick={handleDelete} icon={<TrashIcon size={14} />} />
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
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleCreate} className="card mb-6 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Field label="Destination" className="sm:flex-1">
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
          </Field>
          <Field label="Shipping method" className="sm:flex-1">
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
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Field label="Max weight" hint="Grams" className="sm:flex-1">
            <input
              type="number"
              value={form.maxWeightGrams}
              onChange={(e) => updateField('maxWeightGrams', e.target.value)}
              aria-label="Max weight grams"
              className="field-input"
            />
          </Field>
          <Field label="Cost" hint="JPY" className="sm:flex-1">
            <input
              type="number"
              value={form.costJpy}
              onChange={(e) => updateField('costJpy', e.target.value)}
              aria-label="Cost JPY"
              className="field-input"
            />
          </Field>
          <Field label="Estimated days" className="sm:flex-1">
            <input
              type="number"
              value={form.estimatedDays}
              onChange={(e) => updateField('estimatedDays', e.target.value)}
              aria-label="Estimated days"
              className="field-input"
            />
          </Field>
        </div>
        <button type="submit" className="btn-primary self-start" disabled={createRate.isPending}>
          Add rate
        </button>
        {createError && <p className="error-text">{createError}</p>}
      </form>

      {isLoading && <Spinner label="Fetching shipping rates" />}

      {!isLoading && groups.length === 0 && <p className="text-ink/50">No shipping rates configured yet.</p>}

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <details key={group.destination} className="card p-0">
            <summary className="cursor-pointer select-none px-4 py-3 text-lg font-medium text-ink marker:text-ink/40">
              {destinationLabel(group.destination)}
            </summary>
            <div className="flex flex-col gap-2 px-4 pb-4">
              {group.methods.map((method) => (
                <details key={method.shippingMethod} className="rounded-lg bg-surface">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-forest marker:text-ink/30">
                    {METHOD_LABELS[method.shippingMethod]}
                  </summary>
                  <ul className="flex flex-col divide-y divide-mist px-3 pb-2">
                    {method.rates.map((rate) => (
                      <RateRow key={rate.id} rate={rate} />
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
