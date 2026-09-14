import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useInventory } from '../api/inventory'
import type { CreateOrderItemInput } from '../api/orders'
import { ImageDropInput } from './ImageDropInput'
import { PreorderBadge } from './PreorderBadge'
import { ThumbnailImage } from './ThumbnailImage'
import { TrashIcon } from './icons'
import type { InventoryItem } from '../types/api'

export interface DraftItem {
  input: CreateOrderItemInput
  displayTitle: string
  imageKey?: string
  isPreorder?: boolean
  expectedReleaseDate?: string | null
}

export function draftFromInventoryItem(item: InventoryItem): DraftItem {
  return {
    // Max price is always EUR - fixed by policy, not a per-item choice.
    input: { inventoryItemId: item.id, currency: 'EUR', quantity: 1 },
    displayTitle: item.title,
    imageKey: item.images[0],
    isPreorder: item.isPreorder,
    expectedReleaseDate: item.expectedReleaseDate,
  }
}

const customItemSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    link: z.string().optional(),
    condition: z.enum(['NEW', 'USED']),
    maxPrice: z.string().optional(),
    quantity: z.string().optional(),
    isPreorder: z.boolean().optional(),
    expectedReleaseDate: z.string().optional(),
  })
  .refine((data) => !data.isPreorder || !!data.expectedReleaseDate, {
    message: 'Expected release date is required for a preorder',
    path: ['expectedReleaseDate'],
  })

type CustomItemForm = z.infer<typeof customItemSchema>

function CustomItemForm({ onAdd }: { onAdd: (item: DraftItem) => void }) {
  const [imageKey, setImageKey] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CustomItemForm>({ resolver: zodResolver(customItemSchema), defaultValues: { condition: 'NEW' } })
  const isPreorder = watch('isPreorder')

  function onSubmit(data: CustomItemForm) {
    onAdd({
      input: {
        title: data.title,
        description: data.description,
        link: data.link || undefined,
        condition: data.condition,
        // Max price is always EUR - fixed by policy, not a per-item choice.
        currency: 'EUR',
        maxPrice: data.maxPrice ? Number(data.maxPrice) : undefined,
        quantity: data.quantity ? Number(data.quantity) : 1,
        imageKey,
        isPreorder: data.isPreorder,
        expectedReleaseDate: data.isPreorder ? data.expectedReleaseDate : undefined,
      },
      displayTitle: data.title,
      imageKey,
      isPreorder: data.isPreorder,
      expectedReleaseDate: data.isPreorder ? data.expectedReleaseDate : null,
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
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          step="0.01"
          placeholder="Max price in EUR (optional)"
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
      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input type="checkbox" {...register('isPreorder')} />
        This is a preorder
      </label>
      {isPreorder && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Expected release date</span>
          <input type="date" className="field-input sm:w-48" {...register('expectedReleaseDate')} aria-label="Expected release date" />
          {errors.expectedReleaseDate && <p className="error-text">{errors.expectedReleaseDate.message}</p>}
        </label>
      )}
      <button type="submit" className="btn-secondary self-start" disabled={uploading}>
        Add item
      </button>
    </form>
  )
}

function InventorySearch({ onSelect, onCreateCustom }: { onSelect: (item: InventoryItem) => void; onCreateCustom: () => void }) {
  const [search, setSearch] = useState('')
  const query = search.trim()
  const { data } = useInventory({ title: query, page: 0, enabled: query.length > 0 })
  const results = query ? (data?.content ?? []) : []

  return (
    <div className="card flex flex-col gap-2">
      <input
        placeholder="Search inventory to add an item..."
        className="field-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search inventory"
      />
      {query && results.length > 0 && (
        <ul className="flex flex-col divide-y divide-mist">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-mist"
                onClick={() => {
                  onSelect(item)
                  setSearch('')
                }}
              >
                <ThumbnailImage imageKey={item.images[0]} className="h-10 w-10 shrink-0 rounded-lg" />
                <span className="text-sm text-ink/80">{item.title}</span>
                {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate} />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query && results.length === 0 && (
        <p className="text-sm text-ink/60">
          No matching item.{' '}
          <button type="button" className="text-forest underline" onClick={onCreateCustom}>
            Create a custom request instead
          </button>
        </p>
      )}
    </div>
  )
}

/** Search-inventory-first item builder for an order: select a match to add it directly, or fall
 *  through to a custom-item form when nothing matches. Shared by the user's new-order page and
 *  the admin's create-order-for-user form. */
export function OrderItemBuilder({
  items,
  onAdd,
  onRemove,
}: {
  items: DraftItem[]
  onAdd: (item: DraftItem) => void
  onRemove: (index: number) => void
}) {
  const [showCustomForm, setShowCustomForm] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="card flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-3">
                <ThumbnailImage imageKey={item.imageKey} className="h-10 w-10 shrink-0 rounded-lg" />
                <span className="text-sm text-ink/80">{item.displayTitle}</span>
                {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate ?? null} />}
              </span>
              <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => onRemove(index)}>
                <TrashIcon size={13} /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <InventorySearch onSelect={(item) => onAdd(draftFromInventoryItem(item))} onCreateCustom={() => setShowCustomForm(true)} />

      {showCustomForm ? (
        <CustomItemForm onAdd={onAdd} />
      ) : (
        <button type="button" className="btn-secondary self-start" onClick={() => setShowCustomForm(true)}>
          Can't find it? Create a custom request
        </button>
      )}
    </div>
  )
}
