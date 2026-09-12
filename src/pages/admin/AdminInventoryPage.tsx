import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  useAdminCategories,
  useAdminInventory,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryStatus,
} from '../../api/adminInventory'
import { Pagination } from '../../components/Pagination'
import { Spinner } from '../../components/Spinner'
import { ImageDropInput } from '../../components/ImageDropInput'
import { useConfirm } from '../../components/ConfirmDialog'
import { TrashIcon } from '../../components/icons'

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  condition: z.enum(['NEW', 'USED']),
  currency: z.enum(['JPY', 'EUR']),
  priceAmount: z.string().min(1, 'Price is required'),
  stockQuantity: z.string().min(1, 'Stock is required'),
})

type ItemForm = z.infer<typeof itemSchema>

export function AdminInventoryPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useAdminInventory(page)
  const { data: categories } = useAdminCategories()
  const createItem = useCreateInventoryItem()
  const updateStatus = useUpdateInventoryStatus()
  const deleteItem = useDeleteInventoryItem()
  const confirm = useConfirm()

  const [imageKeys, setImageKeys] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemForm>({ resolver: zodResolver(itemSchema), defaultValues: { condition: 'NEW', currency: 'JPY' } })

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]))
  }

  async function onSubmit(data: ItemForm) {
    await createItem.mutateAsync({
      title: data.title,
      description: data.description,
      condition: data.condition,
      currency: data.currency,
      priceAmount: Number(data.priceAmount),
      stockQuantity: Number(data.stockQuantity),
      imageKeys,
      categoryIds: selectedCategoryIds,
    })
    reset()
    setImageKeys([])
    setSelectedCategoryIds([])
  }

  async function handleDelete(id: string, title: string) {
    const ok = await confirm({
      title: 'Delete item',
      message: `Delete "${title}" from inventory? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteItem.mutate(id)
  }

  return (
    <div>
      <h1 className="page-title mb-4">Admin: Inventory</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card mb-6 flex flex-col gap-2">
        <input placeholder="Title" className="field-input" {...register('title')} aria-label="Title" />
        {errors.title && <p className="error-text">{errors.title.message}</p>}
        <textarea placeholder="Description" className="field-input" {...register('description')} aria-label="Description" />
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
          <input placeholder="Price" className="field-input" {...register('priceAmount')} aria-label="Price" />
          <input placeholder="Stock quantity" className="field-input" {...register('stockQuantity')} aria-label="Stock quantity" />
        </div>
        {errors.priceAmount && <p className="error-text">{errors.priceAmount.message}</p>}
        {errors.stockQuantity && <p className="error-text">{errors.stockQuantity.message}</p>}
        <ImageDropInput label="Photo" onUploaded={(key) => setImageKeys(key ? (current) => [...current, key] : (current) => current)} />
        {imageKeys.length > 0 && <p className="text-xs text-ink/50">{imageKeys.length} photo(s) added.</p>}

        <fieldset className="flex flex-col gap-1">
          <legend className="field-label mb-1">Categories</legend>
          <div className="flex flex-wrap gap-3">
            {categories?.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink/80">
                <input type="checkbox" checked={selectedCategoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary self-start" disabled={createItem.isPending}>
          Create item
        </button>
      </form>

      {isLoading && <Spinner label="Fetching inventory" />}

      <ul className="flex flex-col gap-2">
        {data?.content.map((item) => (
          <li key={item.id} className="card flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-ink/80">
              {item.title} — {item.status} — {item.priceAmount} {item.currency}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => updateStatus.mutate({ id: item.id, status: item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}
              >
                {item.status === 'ACTIVE' ? 'Archive' : 'Activate'}
              </button>
              <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => handleDelete(item.id, item.title)}>
                <TrashIcon size={13} /> Delete
              </button>
            </span>
          </li>
        ))}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
