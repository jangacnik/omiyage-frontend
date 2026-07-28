import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useInventoryItem } from '../api/inventory'
import { useCreateOrder, type CreateOrderItemInput } from '../api/orders'
import { api } from '../lib/apiClient'
import { ButtonSpinner } from '../components/Spinner'

const customItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  condition: z.enum(['NEW', 'USED']),
  currency: z.enum(['JPY', 'EUR']),
  maxPrice: z.string().optional(),
})

type CustomItemForm = z.infer<typeof customItemSchema>

function CustomItemForm({ onAdd }: { onAdd: (item: CreateOrderItemInput) => void }) {
  const [imageKey, setImageKey] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomItemForm>({ resolver: zodResolver(customItemSchema), defaultValues: { condition: 'NEW', currency: 'JPY' } })

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await api.upload<{ key: string }>('/api/images', file)
      setImageKey(result.key)
    } finally {
      setUploading(false)
    }
  }

  function onSubmit(data: CustomItemForm) {
    onAdd({ ...data, maxPrice: data.maxPrice ? Number(data.maxPrice) : undefined, imageKey, quantity: 1 })
    reset()
    setImageKey(undefined)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-2">
      <input placeholder="Title" className="field-input" {...register('title')} aria-label="Title" />
      {errors.title && <p className="error-text">{errors.title.message}</p>}
      <textarea placeholder="Description (optional)" className="field-input" {...register('description')} aria-label="Description" />
      <div className="flex gap-2">
        <select {...register('condition')} aria-label="Condition" className="field-input">
          <option value="NEW">New</option>
          <option value="USED">Used</option>
        </select>
        <select {...register('currency')} aria-label="Currency" className="field-input">
          <option value="JPY">JPY</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <input
        type="number"
        step="0.01"
        placeholder="Max price (optional)"
        className="field-input"
        {...register('maxPrice')}
        aria-label="Max price"
      />
      <input type="file" accept="image/*" onChange={handleImageChange} aria-label="Photo" className="text-sm text-slate-600" />
      {uploading && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <ButtonSpinner /> Uploading...
        </p>
      )}
      <button type="submit" className="btn-secondary self-start" disabled={uploading}>
        Add item
      </button>
    </form>
  )
}

export function OrdersNewPage() {
  const [searchParams] = useSearchParams()
  const preselectedInventoryItemId = searchParams.get('inventoryItemId') ?? undefined
  const { data: preselectedItem } = useInventoryItem(preselectedInventoryItemId)

  const [items, setItems] = useState<CreateOrderItemInput[]>([])
  const [prefilledAdded, setPrefilledAdded] = useState(false)
  const createOrder = useCreateOrder()
  const navigate = useNavigate()

  useEffect(() => {
    if (preselectedItem && !prefilledAdded) {
      setItems((current) => [...current, { inventoryItemId: preselectedItem.id, currency: preselectedItem.currency, quantity: 1 }])
      setPrefilledAdded(true)
    }
  }, [preselectedItem, prefilledAdded])

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index))
  }

  async function submit() {
    const order = await createOrder.mutateAsync({ items })
    navigate(`/orders/${order.id}`)
  }

  return (
    <div className="max-w-xl">
      <h1 className="page-title mb-4">New request</h1>

      {items.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="card flex items-center justify-between py-2">
              <span className="text-sm text-slate-700">
                {item.inventoryItemId ? `Inventory item: ${preselectedItem?.title ?? item.inventoryItemId}` : item.title}
                {' — '}
                {item.currency}
              </span>
              <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => removeItem(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <CustomItemForm onAdd={(item) => setItems((current) => [...current, item])} />

      <button
        type="button"
        className="btn-primary mt-4"
        disabled={items.length === 0 || createOrder.isPending}
        onClick={submit}
      >
        {createOrder.isPending ? (
          <>
            <ButtonSpinner /> Submitting
          </>
        ) : (
          'Submit request'
        )}
      </button>
      {createOrder.isError && <p className="error-text mt-2">Could not submit request.</p>}
    </div>
  )
}
