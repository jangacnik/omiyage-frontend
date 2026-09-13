import { useState, type Dispatch, type SetStateAction } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  useAdminCategories,
  useAdminInventory,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
  useUpdateInventoryStatus,
} from '../../api/adminInventory'
import { Pagination } from '../../components/Pagination'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { ImageDropInput } from '../../components/ImageDropInput'
import { ItemCardShell } from '../../components/ItemCardShell'
import { ThumbnailImage } from '../../components/ThumbnailImage'
import { useConfirm } from '../../components/ConfirmDialog'
import { formatMoney } from '../../lib/currency'
import { TrashIcon } from '../../components/icons'
import type { InventoryItem } from '../../types/api'

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  link: z.string().optional(),
  condition: z.enum(['NEW', 'USED']),
  currency: z.enum(['JPY', 'EUR']),
  priceAmount: z.string().min(1, 'Price is required'),
  stockQuantity: z.string().min(1, 'Stock is required'),
})

type ItemForm = z.infer<typeof itemSchema>

function ImageGallery({ images, onChange }: { images: string[]; onChange: Dispatch<SetStateAction<string[]>> }) {
  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((key) => (
            <div key={key} className="relative">
              <ThumbnailImage imageKey={key} className="h-20 w-20 rounded-lg" />
              <button
                type="button"
                onClick={() => onChange((current) => current.filter((k) => k !== key))}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs text-white hover:bg-ink"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <ImageDropInput
        label="Add photo"
        onUploaded={(key) => key && onChange((current) => [...current, key])}
      />
    </div>
  )
}

function EditItemForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const updateItem = useUpdateInventoryItem()
  const [images, setImages] = useState<string[]>(item.images)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: item.title,
      description: item.description ?? '',
      link: item.link ?? '',
      condition: item.condition,
      currency: item.currency,
      priceAmount: item.priceAmount.toString(),
      stockQuantity: item.stockQuantity.toString(),
    },
  })

  async function onSubmit(data: ItemForm) {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        title: data.title,
        description: data.description,
        link: data.link || undefined,
        condition: data.condition,
        currency: data.currency,
        priceAmount: Number(data.priceAmount),
        stockQuantity: Number(data.stockQuantity),
        imageKeys: images,
        categoryIds: item.categories.map((c) => c.id),
      })
      onDone()
    } catch {
      // updateItem.isError renders the message below - stay open so the admin can retry.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <ItemCardShell thumbnail={<ImageGallery images={images} onChange={setImages} />}>
        <div className="flex flex-col gap-2">
          <input placeholder="Title" className="field-input" {...register('title')} aria-label={`Title for ${item.title}`} />
          {errors.title && <p className="error-text">{errors.title.message}</p>}
          <textarea placeholder="Description" className="field-input" {...register('description')} aria-label={`Description for ${item.title}`} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select {...register('condition')} aria-label={`Condition for ${item.title}`} className="field-input">
              <option value="NEW">New</option>
              <option value="USED">Used</option>
            </select>
            <select {...register('currency')} aria-label={`Currency for ${item.title}`} className="field-input">
              <option value="JPY">JPY</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input placeholder="Price" className="field-input" {...register('priceAmount')} aria-label={`Price for ${item.title}`} />
            <input placeholder="Stock quantity" className="field-input" {...register('stockQuantity')} aria-label={`Stock quantity for ${item.title}`} />
          </div>
          <input
            type="url"
            placeholder="Link to store page (optional)"
            className="field-input"
            {...register('link')}
            aria-label={`Link for ${item.title}`}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-3 py-1.5 text-sm" disabled={updateItem.isPending}>
              {updateItem.isPending ? <ButtonSpinner /> : 'Save'}
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onDone}>
              Cancel
            </button>
          </div>
          {updateItem.isError && <p className="error-text">Could not save changes.</p>}
        </div>
      </ItemCardShell>
    </form>
  )
}

function InventoryRow({
  item,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  item: InventoryItem
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  return (
    <li className="card">
      <ItemCardShell
        thumbnail={<ThumbnailImage imageKey={item.images[0]} className="h-20 w-20 shrink-0 rounded-lg" />}
        actions={
          <>
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={onToggleStatus}>
              {item.status === 'ACTIVE' ? 'Archive' : 'Activate'}
            </button>
            <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={onDelete}>
              <TrashIcon size={13} /> Delete
            </button>
          </>
        }
      >
        <p className="font-medium text-ink">{item.title}</p>
        <p className="mt-1 text-sm text-ink/60">
          {item.status} · {formatMoney(item.priceAmount, item.currency)}
        </p>
      </ItemCardShell>
    </li>
  )
}

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
      link: data.link || undefined,
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

  const [editingId, setEditingId] = useState<string | null>(null)

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
        <input type="url" placeholder="Link to store page (optional)" className="field-input" {...register('link')} aria-label="Link to store page" />
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
        {data?.content.map((item) =>
          editingId === item.id ? (
            <li key={item.id}>
              <EditItemForm item={item} onDone={() => setEditingId(null)} />
            </li>
          ) : (
            <InventoryRow
              key={item.id}
              item={item}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => handleDelete(item.id, item.title)}
              onToggleStatus={() => updateStatus.mutate({ id: item.id, status: item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}
            />
          ),
        )}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
