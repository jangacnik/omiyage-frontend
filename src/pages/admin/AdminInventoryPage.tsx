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
import { api } from '../../lib/apiClient'
import { Pagination } from '../../components/Pagination'

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

  const [imageKeys, setImageKeys] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemForm>({ resolver: zodResolver(itemSchema), defaultValues: { condition: 'NEW', currency: 'JPY' } })

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await api.upload<{ key: string }>('/api/images', file)
      setImageKeys((current) => [...current, result.key])
    } finally {
      setUploading(false)
    }
  }

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

  return (
    <div>
      <h1>Admin: Inventory</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 border border-gray-200 p-3">
        <input placeholder="Title" {...register('title')} aria-label="Title" />
        {errors.title && <p>{errors.title.message}</p>}
        <textarea placeholder="Description" {...register('description')} aria-label="Description" />
        <select {...register('condition')} aria-label="Condition">
          <option value="NEW">New</option>
          <option value="USED">Used</option>
        </select>
        <select {...register('currency')} aria-label="Currency">
          <option value="JPY">JPY</option>
          <option value="EUR">EUR</option>
        </select>
        <input placeholder="Price" {...register('priceAmount')} aria-label="Price" />
        {errors.priceAmount && <p>{errors.priceAmount.message}</p>}
        <input placeholder="Stock quantity" {...register('stockQuantity')} aria-label="Stock quantity" />
        {errors.stockQuantity && <p>{errors.stockQuantity.message}</p>}
        <input type="file" accept="image/*" onChange={handleImageChange} aria-label="Photo" />
        {uploading && <p>Uploading...</p>}

        <fieldset>
          <legend>Categories</legend>
          {categories?.map((c) => (
            <label key={c.id}>
              <input type="checkbox" checked={selectedCategoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
              {c.name}
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={createItem.isPending || uploading}>
          Create item
        </button>
      </form>

      {isLoading && <p>Loading...</p>}

      <ul>
        {data?.content.map((item) => (
          <li key={item.id}>
            {item.title} — {item.status} — {item.priceAmount} {item.currency}
            <button
              type="button"
              onClick={() => updateStatus.mutate({ id: item.id, status: item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}
            >
              {item.status === 'ACTIVE' ? 'Archive' : 'Activate'}
            </button>
            <button type="button" onClick={() => deleteItem.mutate(item.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
