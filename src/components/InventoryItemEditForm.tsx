import { useState, type Dispatch, type SetStateAction } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useUpdateInventoryItem } from '../api/adminInventory'
import { Field } from './Field'
import { ImageDropInput } from './ImageDropInput'
import { ItemCardShell } from './ItemCardShell'
import { ThumbnailImage } from './ThumbnailImage'
import { ButtonSpinner } from './Spinner'
import type { InventoryItem } from '../types/api'

const itemSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    link: z.string().optional(),
    condition: z.enum(['NEW', 'USED']),
    priceAmount: z.string().min(1, 'Price is required'),
    boughtPrice: z.string().optional(),
    stockQuantity: z.string().min(1, 'Stock is required'),
    tags: z.string().optional(),
    isPreorder: z.boolean().optional(),
    expectedReleaseDate: z.string().optional(),
  })
  .refine((data) => !data.isPreorder || !!data.expectedReleaseDate, {
    message: 'Expected release date is required for a preorder',
    path: ['expectedReleaseDate'],
  })

export type InventoryItemForm = z.infer<typeof itemSchema>
export { itemSchema }

export function parseTags(input: string | undefined): string[] {
  return (input ?? '').split(',').map((t) => t.trim()).filter(Boolean)
}

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
      <ImageDropInput label="Add photo" onUploaded={(key) => key && onChange((current) => [...current, key])} />
    </div>
  )
}

/** Edit form for one inventory item, shared by the admin inventory page and the public homepage
 *  (which shows the same edit/delete controls to admin viewers). Rendered as a modal dialog by
 *  both callers - the backdrop/centering wrapper is theirs, this is just the dialog panel. */
export function InventoryItemEditForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const updateItem = useUpdateInventoryItem()
  const [images, setImages] = useState<string[]>(item.images)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InventoryItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: item.title,
      description: item.description ?? '',
      link: item.link ?? '',
      condition: item.condition,
      priceAmount: item.priceAmount.toString(),
      boughtPrice: item.boughtPrice?.toString() ?? '',
      stockQuantity: item.stockQuantity.toString(),
      tags: item.tags.join(', '),
      isPreorder: item.isPreorder,
      expectedReleaseDate: item.expectedReleaseDate ?? '',
    },
  })
  const isPreorder = watch('isPreorder')

  async function onSubmit(data: InventoryItemForm) {
    try {
      await updateItem.mutateAsync({
        id: item.id,
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
        imageKeys: images,
        categoryIds: item.categories.map((c) => c.id),
        tags: parseTags(data.tags),
        isPreorder: data.isPreorder,
        expectedReleaseDate: data.isPreorder ? data.expectedReleaseDate : undefined,
      })
      onDone()
    } catch {
      // updateItem.isError renders the message below - stay open so the admin can retry.
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-inventory-item-title"
      className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto"
    >
      <h2 id="edit-inventory-item-title" className="page-title mb-3 text-lg">
        Edit item
      </h2>
      <ItemCardShell thumbnail={<ImageGallery images={images} onChange={setImages} />}>
        <div className="flex flex-col gap-2">
          <Field label="Title">
            <input className="field-input" {...register('title')} aria-label={`Title for ${item.title}`} />
          </Field>
          {errors.title && <p className="error-text">{errors.title.message}</p>}
          <Field label="Description" hint="Optional">
            <textarea className="field-input" {...register('description')} aria-label={`Description for ${item.title}`} />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Field label="Condition" className="sm:w-40">
              <select {...register('condition')} aria-label={`Condition for ${item.title}`} className="field-input">
                <option value="NEW">New</option>
                <option value="USED">Used</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Price" hint="In EUR">
              <input className="field-input" {...register('priceAmount')} aria-label={`Price in EUR for ${item.title}`} />
            </Field>
            <Field label="Bought price" hint="In JPY, admin only">
              <input className="field-input" {...register('boughtPrice')} aria-label={`Bought price in JPY for ${item.title}`} />
            </Field>
            <Field label="Stock quantity">
              <input className="field-input" {...register('stockQuantity')} aria-label={`Stock quantity for ${item.title}`} />
            </Field>
          </div>
          <Field label="Link to store page" hint="Optional">
            <input type="url" className="field-input" {...register('link')} aria-label={`Link for ${item.title}`} />
          </Field>
          <Field label="Tags" hint="Comma separated, optional">
            <input className="field-input" {...register('tags')} aria-label={`Tags for ${item.title}`} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" {...register('isPreorder')} />
            This is a preorder
          </label>
          {isPreorder && (
            <Field label="Expected release date">
              <input
                type="date"
                className="field-input sm:w-48"
                {...register('expectedReleaseDate')}
                aria-label={`Expected release date for ${item.title}`}
              />
              {errors.expectedReleaseDate && <p className="error-text">{errors.expectedReleaseDate.message}</p>}
            </Field>
          )}
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
