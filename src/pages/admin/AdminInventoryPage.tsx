import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  useAdminCategories,
  useAdminInventory,
  useCreateInventoryItem,
  useDeleteInventoryItem,
} from '../../api/adminInventory'
import { Field } from '../../components/Field'
import { Pagination } from '../../components/Pagination'
import { Spinner } from '../../components/Spinner'
import { ImageDropInput } from '../../components/ImageDropInput'
import { InventoryCard } from '../../components/InventoryCard'
import { InventoryItemEditForm, itemSchema, parseTags, type InventoryItemForm } from '../../components/InventoryItemEditForm'
import { useConfirm } from '../../components/ConfirmDialog'

export function AdminInventoryPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useAdminInventory(page)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingItem = data?.content.find((item) => item.id === editingId)
  const { data: categories } = useAdminCategories()
  const createItem = useCreateInventoryItem()
  const deleteItem = useDeleteInventoryItem()
  const confirm = useConfirm()

  const [imageKeys, setImageKeys] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InventoryItemForm>({ resolver: zodResolver(itemSchema), defaultValues: { condition: 'NEW' } })
  const isPreorder = watch('isPreorder')

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]))
  }

  async function onSubmit(data: InventoryItemForm) {
    await createItem.mutateAsync({
      title: data.title,
      description: data.description,
      link: data.link || undefined,
      condition: data.condition,
      // Listed price is always EUR, bought price is always JPY - fixed by policy, see
      // InventoryService.create/update on the backend.
      currency: 'EUR',
      priceAmount: Number(data.priceAmount),
      boughtPrice: data.boughtPrice ? Number(data.boughtPrice) : undefined,
      stockQuantity: Number(data.stockQuantity),
      imageKeys,
      categoryIds: selectedCategoryIds,
      tags: parseTags(data.tags),
      isPreorder: data.isPreorder,
      expectedReleaseDate: data.isPreorder ? data.expectedReleaseDate : undefined,
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
        <Field label="Title">
          <input className="field-input" {...register('title')} aria-label="Title" />
        </Field>
        {errors.title && <p className="error-text">{errors.title.message}</p>}
        <Field label="Description" hint="Optional">
          <textarea className="field-input" {...register('description')} aria-label="Description" />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Field label="Condition" className="sm:w-40">
            <select {...register('condition')} aria-label="Condition" className="field-input">
              <option value="NEW">New</option>
              <option value="USED">Used</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="Price" hint="In EUR">
            <input className="field-input" {...register('priceAmount')} aria-label="Price in EUR" />
          </Field>
          <Field label="Bought price" hint="In JPY, admin only">
            <input className="field-input" {...register('boughtPrice')} aria-label="Bought price in JPY" />
          </Field>
          <Field label="Stock quantity">
            <input className="field-input" {...register('stockQuantity')} aria-label="Stock quantity" />
          </Field>
        </div>
        {errors.priceAmount && <p className="error-text">{errors.priceAmount.message}</p>}
        {errors.stockQuantity && <p className="error-text">{errors.stockQuantity.message}</p>}
        <Field label="Link to store page" hint="Optional">
          <input type="url" className="field-input" {...register('link')} aria-label="Link to store page" />
        </Field>
        <Field label="Tags" hint="Comma separated, optional">
          <input className="field-input" {...register('tags')} aria-label="Tags" />
        </Field>
        <ImageDropInput label="Photo" onUploaded={(key) => setImageKeys(key ? (current) => [...current, key] : (current) => current)} />
        {imageKeys.length > 0 && <p className="text-xs text-ink/50">{imageKeys.length} photo(s) added.</p>}

        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" {...register('isPreorder')} />
          This is a preorder
        </label>
        {isPreorder && (
          <Field label="Expected release date">
            <input type="date" className="field-input sm:w-48" {...register('expectedReleaseDate')} aria-label="Expected release date" />
            {errors.expectedReleaseDate && <p className="error-text">{errors.expectedReleaseDate.message}</p>}
          </Field>
        )}

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {data?.content.map((item) => (
          <InventoryCard
            key={item.id}
            item={item}
            onEdit={() => setEditingId(item.id)}
            onDelete={() => handleDelete(item.id, item.title)}
          />
        ))}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {editingItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={() => setEditingId(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <InventoryItemEditForm item={editingItem} onDone={() => setEditingId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
