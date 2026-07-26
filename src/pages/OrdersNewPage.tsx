import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useInventoryItem } from '../api/inventory'
import { useCreateOrder, type CreateOrderItemInput } from '../api/orders'
import { api } from '../lib/apiClient'

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 border border-gray-200 p-3">
      <input placeholder="Title" {...register('title')} aria-label="Title" />
      {errors.title && <p>{errors.title.message}</p>}
      <textarea placeholder="Description (optional)" {...register('description')} aria-label="Description" />
      <select {...register('condition')} aria-label="Condition">
        <option value="NEW">New</option>
        <option value="USED">Used</option>
      </select>
      <select {...register('currency')} aria-label="Currency">
        <option value="JPY">JPY</option>
        <option value="EUR">EUR</option>
      </select>
      <input type="number" step="0.01" placeholder="Max price (optional)" {...register('maxPrice')} aria-label="Max price" />
      <input type="file" accept="image/*" onChange={handleImageChange} aria-label="Photo" />
      {uploading && <p>Uploading...</p>}
      <button type="submit" disabled={uploading}>
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
    <div>
      <h1>New request</h1>

      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {item.inventoryItemId ? `Inventory item: ${preselectedItem?.title ?? item.inventoryItemId}` : item.title}
            {' — '}
            {item.currency}
            <button type="button" onClick={() => removeItem(index)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <CustomItemForm onAdd={(item) => setItems((current) => [...current, item])} />

      <button type="button" disabled={items.length === 0 || createOrder.isPending} onClick={submit}>
        Submit request
      </button>
      {createOrder.isError && <p>Could not submit request.</p>}
    </div>
  )
}
