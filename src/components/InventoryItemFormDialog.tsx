import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAdminCategories, useCreateInventoryItem, useUpdateInventoryItem } from '../api/adminInventory'
import { useItemTemplates } from '../api/adminItemTemplates'
import { Field } from './Field'
import { ImageGallery } from './ImageGallery'
import { ItemCardShell } from './ItemCardShell'
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
    weight: z.string().optional(),
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

const emptyDefaults: InventoryItemForm = {
  title: '',
  description: '',
  link: '',
  condition: 'NEW',
  priceAmount: '',
  boughtPrice: '',
  // A new item defaults to zero on hand rather than forcing the admin to type it - most new
  // catalog entries start out-of-stock (pending a restock/purchase) rather than already in hand.
  stockQuantity: '0',
  weight: '',
  tags: '',
  isPreorder: false,
  expectedReleaseDate: '',
}

function defaultsFor(item: InventoryItem | undefined): InventoryItemForm {
  if (!item) return emptyDefaults
  return {
    title: item.title,
    description: item.description ?? '',
    link: item.link ?? '',
    condition: item.condition,
    priceAmount: item.priceAmount.toString(),
    boughtPrice: item.boughtPrice?.toString() ?? '',
    stockQuantity: item.stockQuantity.toString(),
    weight: item.weight?.toString() ?? '',
    tags: item.tags.join(', '),
    isPreorder: item.isPreorder,
    expectedReleaseDate: item.expectedReleaseDate ?? '',
  }
}

/** Create/edit dialog for one inventory item - shared by the admin inventory page (both "Add
 *  item" and per-item "Edit") and the public homepage (which shows the edit/delete controls to
 *  admin viewers, edit-only there). Rendered inside a Modal by every caller - this is just the
 *  panel. */
export function InventoryItemFormDialog({ item, onDone }: { item?: InventoryItem; onDone: () => void }) {
  const isEdit = item != null
  const createItem = useCreateInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const mutation = isEdit ? updateItem : createItem
  const [images, setImages] = useState<string[]>(item?.images ?? [])
  const [categoryIds, setCategoryIds] = useState<string[]>(item?.categories.map((c) => c.id) ?? [])
  const { data: categories } = useAdminCategories()
  const { data: templates } = useItemTemplates()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InventoryItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: defaultsFor(item),
  })
  const isPreorder = watch('isPreorder')

  function toggleCategory(id: string) {
    setCategoryIds((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]))
  }

  // Only fills in the fields the template actually sets - a template that's just a common weight
  // preset, say, shouldn't blank out a title the admin already typed.
  function applyTemplate(templateId: string) {
    const template = templates?.find((t) => t.id === templateId)
    if (!template) return
    if (template.title != null) setValue('title', template.title)
    if (template.description != null) setValue('description', template.description)
    if (template.priceAmount != null) setValue('priceAmount', template.priceAmount.toString())
    if (template.boughtPrice != null) setValue('boughtPrice', template.boughtPrice.toString())
    if (template.weight != null) setValue('weight', template.weight.toString())
  }

  async function onSubmit(data: InventoryItemForm) {
    try {
      const input = {
        title: data.title,
        description: data.description,
        link: data.link || undefined,
        condition: data.condition,
        // Listed price is always EUR, bought price is always JPY - fixed by policy, see
        // InventoryService.create/update on the backend.
        currency: 'EUR' as const,
        priceAmount: Number(data.priceAmount),
        boughtPrice: data.boughtPrice ? Number(data.boughtPrice) : undefined,
        stockQuantity: Number(data.stockQuantity),
        weight: data.weight ? Number(data.weight) : undefined,
        imageKeys: images,
        categoryIds,
        tags: parseTags(data.tags),
        isPreorder: data.isPreorder,
        expectedReleaseDate: data.isPreorder ? data.expectedReleaseDate : undefined,
      }
      if (item) {
        await updateItem.mutateAsync({ id: item.id, ...input })
      } else {
        await createItem.mutateAsync(input)
      }
      onDone()
    } catch {
      // mutation.isError renders the message below - stay open so the admin can retry.
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto"
    >
      <h2 id="inventory-item-dialog-title" className="page-title mb-3 text-lg">
        {isEdit ? 'Edit item' : 'Add item'}
      </h2>
      <ItemCardShell thumbnail={<div className="sm:w-64 sm:shrink-0"><ImageGallery images={images} onChange={setImages} /></div>}>
        <div className="flex flex-col gap-2">
          {!isEdit && templates && templates.length > 0 && (
            <Field label="Start from a template" hint="Optional">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value)
                  e.target.value = ''
                }}
                aria-label="Start from a template"
                className="field-input"
              >
                <option value="" disabled>
                  Choose a template…
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
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
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <Field label="Price" hint="In EUR">
                <input className="field-input" {...register('priceAmount')} aria-label="Price in EUR" />
              </Field>
              <Field label="Bought price" hint="In JPY, admin only">
                <input className="field-input" {...register('boughtPrice')} aria-label="Bought price in JPY" />
              </Field>
              <Field label="Weight" hint="Grams, admin only">
                <input className="field-input" {...register('weight')} aria-label="Weight in grams" />
              </Field>
            </div>
            <Field label="Stock quantity">
              <input type="number" min={0} className="field-input" {...register('stockQuantity')} aria-label="Stock quantity" />
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
          {categories && categories.length > 0 && (
            <fieldset className="flex flex-col gap-1">
              <legend className="field-label mb-1">Categories</legend>
              <div className="flex flex-wrap gap-3">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink/80">
                    <input type="checkbox" checked={categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
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
                aria-label="Expected release date"
              />
              {errors.expectedReleaseDate && <p className="error-text">{errors.expectedReleaseDate.message}</p>}
            </Field>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-3 py-1.5 text-sm" disabled={mutation.isPending}>
              {mutation.isPending ? <ButtonSpinner /> : isEdit ? 'Save' : 'Create item'}
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onDone}>
              Cancel
            </button>
          </div>
          {mutation.isError && <p className="error-text">Could not save changes.</p>}
        </div>
      </ItemCardShell>
    </form>
  )
}
