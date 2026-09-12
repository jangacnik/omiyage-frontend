import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useInventoryItem } from '../api/inventory'
import { useCreateOrder, type CreateOrderItemInput } from '../api/orders'
import { ButtonSpinner } from '../components/Spinner'
import { ImageDropInput } from '../components/ImageDropInput'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { TrashIcon } from '../components/icons'

const customItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  link: z.string().optional(),
  condition: z.enum(['NEW', 'USED']),
  currency: z.enum(['JPY', 'EUR']),
  maxPrice: z.string().optional(),
  quantity: z.string().optional(),
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

  function onSubmit(data: CustomItemForm) {
    onAdd({
      ...data,
      maxPrice: data.maxPrice ? Number(data.maxPrice) : undefined,
      quantity: data.quantity ? Number(data.quantity) : 1,
      link: data.link || undefined,
      imageKey,
    })
    reset()
    setImageKey(undefined)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-2">
      <input placeholder="Title" className="field-input" {...register('title')} aria-label="Title" />
      {errors.title && <p className="error-text">{errors.title.message}</p>}
      <textarea placeholder="Description (optional)" className="field-input" {...register('description')} aria-label="Description" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <select {...register('condition')} aria-label="Condition" className="field-input">
          <option value="NEW">New</option>
          <option value="USED">Used</option>
        </select>
        <select {...register('currency')} aria-label="Currency" className="field-input">
          <option value="JPY">JPY</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          step="0.01"
          placeholder="Max price (optional)"
          className="field-input"
          {...register('maxPrice')}
          aria-label="Max price"
        />
        <label className="flex items-center gap-2 sm:w-32">
          <span className="text-sm text-ink/60">Qty</span>
          <input
            type="number"
            min={1}
            placeholder="1"
            className="field-input"
            {...register('quantity')}
            aria-label="Quantity"
          />
        </label>
      </div>
      <input
        type="url"
        placeholder="Link to store page (optional)"
        className="field-input"
        {...register('link')}
        aria-label="Link to store page"
      />
      <ImageDropInput label="Photo" onUploaded={setImageKey} onUploadingChange={setUploading} />
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
            <li key={index} className="card flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-3">
                <ThumbnailImage imageKey={item.imageKey} className="h-10 w-10 shrink-0 rounded-lg" />
                <span className="text-sm text-ink/80">
                  {item.inventoryItemId ? `Inventory item: ${preselectedItem?.title ?? item.inventoryItemId}` : item.title}
                  {' — '}
                  {item.currency}
                </span>
              </span>
              <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => removeItem(index)}>
                <TrashIcon size={13} /> Remove
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
