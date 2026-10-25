import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { UseMutationResult } from '@tanstack/react-query'
import { useInventory } from '../api/inventory'
import type { CreateOrderItemInput, UpdateMyOrderItemInput } from '../api/orders'
import { CONDITION_LABELS } from '../lib/orderItemLabels'
import { draftFromInventoryItem, preservedContentFields, useAddItemPanelState, type DraftItem } from '../lib/orderItemDrafts'
import { Field } from './Field'
import { ImageDropInput } from './ImageDropInput'
import { PreorderBadge } from './PreorderBadge'
import { QuantityStepper } from './QuantityStepper'
import { ButtonSpinner } from './Spinner'
import { ThumbnailImage } from './ThumbnailImage'
import { IconButton } from './IconButton'
import { TrashIcon } from './icons'
import { errorMessage } from '../lib/apiClient'
import { formatMoney } from '../lib/currency'
import type { InventoryItem, OrderDto, OrderItemDto } from '../types/api'

const customItemSchema = z
  .object({
    title: z.string().min(1, 'Enter a title for the item'),
    description: z.string().optional(),
    link: z.string().optional(),
    condition: z.enum(['NEW', 'USED']),
    maxPrice: z.string().optional(),
    quantity: z.string().optional(),
    isPreorder: z.boolean().optional(),
    expectedReleaseDate: z.string().optional(),
  })
  .refine((data) => !data.isPreorder || !!data.expectedReleaseDate, {
    message: 'Enter the expected release date for a preorder',
    path: ['expectedReleaseDate'],
  })

type CustomItemForm = z.infer<typeof customItemSchema>

export function CustomItemForm({
  onAdd,
  defaultValues,
  submitLabel = 'Add item',
}: {
  /** May reject (e.g. RequestCustomItemPage's onAdd submits straight to the backend) - onSubmit
   *  below only resets the form once this actually resolves, so a failed submission leaves the
   *  member's edits in place to retry instead of silently reverting to defaultValues. */
  onAdd: (item: DraftItem) => void | Promise<unknown>
  /** Prefill from a catalog listing - e.g. "Request with different price or condition" starts
   *  from that item's own title/description/link/price instead of a blank form. */
  defaultValues?: Partial<CustomItemForm> & { imageKey?: string }
  submitLabel?: string
}) {
  const [imageKey, setImageKey] = useState<string | undefined>(defaultValues?.imageKey)
  const [uploading, setUploading] = useState(false)
  // Bumped on every successful add to force ImageDropInput to remount - a caller that keeps this
  // form open across multiple adds (AddItemForm, AdminAddItemForm) never unmounts it itself, and
  // ImageDropInput only seeds its preview once from a mount-time prop, so without a fresh key the
  // just-added photo's preview would silently linger for the next item.
  const [photoResetKey, setPhotoResetKey] = useState(0)
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CustomItemForm>({
    resolver: zodResolver(customItemSchema),
    defaultValues: { condition: 'NEW', quantity: '1', ...defaultValues },
  })
  const isPreorder = useWatch({ control, name: 'isPreorder' })
  const quantity = Number(useWatch({ control, name: 'quantity' })) || 1

  async function onSubmit(data: CustomItemForm) {
    try {
      await onAdd({
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
    } catch {
      // A caller whose onAdd submits straight to the backend (RequestCustomItemPage) surfaces its
      // own error via its mutation's isError - don't clear what the member typed so they can retry.
      return
    }
    reset()
    setImageKey(undefined)
    setPhotoResetKey((k) => k + 1)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-2">
      <Field label="Title" error={errors.title?.message}>
        <input className="field-input" {...register('title')} />
      </Field>
      <Field label="Description" hint="Optional">
        <textarea className="field-input" {...register('description')} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Field label="Condition" className="sm:w-40">
          <select {...register('condition')} className="field-input">
            <option value="NEW">New</option>
            <option value="USED">Used</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Field label="Max price" hint="Optional - in EUR">
          <input type="number" step="0.01" className="field-input" {...register('maxPrice')} />
        </Field>
        <Field label="Qty" className="sm:w-32">
          <QuantityStepper quantity={quantity} onChange={(q) => setValue('quantity', String(q))} label="Quantity" />
        </Field>
      </div>
      <Field label="Link to store page" hint="Optional">
        <input type="url" className="field-input" {...register('link')} />
      </Field>
      <ImageDropInput
        key={photoResetKey}
        label="Photo"
        initialImageKey={defaultValues?.imageKey}
        onUploaded={setImageKey}
        onUploadingChange={setUploading}
      />
      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input type="checkbox" {...register('isPreorder')} />
        This is a preorder
      </label>
      {isPreorder && (
        <Field label="Expected release date" error={errors.expectedReleaseDate?.message}>
          <input type="date" className="field-input sm:w-48" {...register('expectedReleaseDate')} />
        </Field>
      )}
      <button type="submit" className="btn-secondary self-start" disabled={uploading}>
        {submitLabel}
      </button>
    </form>
  )
}

const SEARCH_RESULTS_LIMIT = 8

export function InventorySearch({
  onSelect,
  onCreateCustom,
  onSearchTextChange,
}: {
  onSelect: (item: InventoryItem) => void
  onCreateCustom: () => void
  /** Fires whenever the search box goes from empty to non-empty or back - lets a parent hide its
   *  own "create custom" entry point while this one's contextual prompt is already on screen. */
  onSearchTextChange?: (hasText: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(search.trim()), 300)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    onSearchTextChange?.(search.trim().length > 0)
  }, [search, onSearchTextChange])

  const { data, isFetching } = useInventory({ title: debouncedQuery, page: 0, size: SEARCH_RESULTS_LIMIT, enabled: debouncedQuery.length > 0 })
  // useInventory keeps the previous page's data visible (placeholderData) while a new query
  // fetches, so the results list itself doesn't need to hide during isFetching - only "no match"
  // does, since a fast typist would otherwise see a false "no matching item" flash between
  // keystrokes and the next request landing.
  const hasQuery = debouncedQuery.length > 0
  const results = hasQuery ? (data?.content ?? []) : []
  const showNoMatch = hasQuery && !isFetching && results.length === 0
  const moreResultsExist = (data?.totalElements ?? 0) > results.length

  return (
    <div className="card flex flex-col gap-2">
      <div className="relative">
        <input
          placeholder="Search inventory to add an item..."
          className="field-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search inventory"
        />
        {isFetching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            <ButtonSpinner />
          </span>
        )}
      </div>
      {hasQuery && results.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-mist">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-mist"
                  onClick={() => {
                    onSelect(item)
                    setSearch('')
                    setDebouncedQuery('')
                  }}
                >
                  <ThumbnailImage imageKey={item.images[0]} className="h-10 w-10 shrink-0 rounded-lg" />
                  <span className="text-sm text-ink/80">{item.title}</span>
                  {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate} />}
                </button>
              </li>
            ))}
          </ul>
          {/* Hidden while a newer query is in flight - results/count above are still the previous
              query's placeholderData at that point, so this link's count could otherwise promise
              a total that doesn't match where it actually lands. New tab: this dropdown usually
              sits inside an in-progress draft order (OrdersNewPage, CreateOrderForUser) that lives
              only in local state - navigating away in the same tab would silently lose it. */}
          {moreResultsExist && !isFetching && (
            <Link
              to={`/inventory?title=${encodeURIComponent(debouncedQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-forest hover:underline"
            >
              See all {data?.totalElements} results in Inventory →
            </Link>
          )}
        </>
      )}
      {showNoMatch && (
        <p className="text-sm text-muted">
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
 *  the admin's create-order-for-user form. Selecting a catalog item already in the draft list bumps
 *  its quantity instead of adding a second row for the same item. */
export function OrderItemBuilder({
  items,
  onAdd,
  onRemove,
  onUpdateQuantity,
}: {
  items: DraftItem[]
  onAdd: (item: DraftItem) => void
  onRemove: (index: number) => void
  onUpdateQuantity: (index: number, quantity: number) => void
}) {
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [searching, setSearching] = useState(false)

  function handleSelectInventoryItem(item: InventoryItem) {
    const existingIndex = items.findIndex((draft) => draft.input.inventoryItemId === item.id)
    if (existingIndex >= 0) {
      onUpdateQuantity(existingIndex, (items[existingIndex].input.quantity ?? 1) + 1)
    } else {
      onAdd(draftFromInventoryItem(item))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="card flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-3">
                <ThumbnailImage imageKey={item.imageKey} className="h-10 w-10 shrink-0 rounded-lg" />
                <span className="flex flex-col">
                  <span className="text-sm text-ink/80">{item.displayTitle}</span>
                  <span className="text-xs text-muted">
                    {item.input.condition && `${CONDITION_LABELS[item.input.condition]} · `}
                    {item.input.maxPrice != null ? `max ${formatMoney(item.input.maxPrice, 'EUR')}` : 'no max price set'}
                  </span>
                </span>
                {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate ?? null} />}
              </span>
              <span className="flex items-center gap-2 self-end sm:self-auto">
                <QuantityStepper
                  quantity={item.input.quantity ?? 1}
                  onChange={(quantity) => onUpdateQuantity(index, quantity)}
                  label={`Quantity for ${item.displayTitle}`}
                />
                <IconButton variant="danger" label="Remove" onClick={() => onRemove(index)} icon={<TrashIcon size={14} />} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <InventorySearch onSelect={handleSelectInventoryItem} onCreateCustom={() => setShowCustomForm(true)} onSearchTextChange={setSearching} />

      {showCustomForm ? (
        <CustomItemForm
          onAdd={(item) => {
            onAdd(item)
            setShowCustomForm(false)
          }}
        />
      ) : (
        !searching && (
          <button type="button" className="btn-secondary self-start" onClick={() => setShowCustomForm(true)}>
            Can't find it? Create a custom request
          </button>
        )
      )}
    </div>
  )
}

/** Search-inventory-first "add item to an existing order" panel - used identically by the
 *  member-facing order detail page and the admin equivalent, which only differ in which mutation
 *  hooks they call and whether a locked (bought/shipped) item blocks the quantity-bump PATCH (the
 *  member-facing endpoint 409s on one, the admin one doesn't - see OrderService.kt). */
export function AddItemPanel({
  orderId,
  items,
  useAddMutation,
  useUpdateMutation,
  isLocked,
}: {
  orderId: string
  items: OrderItemDto[]
  useAddMutation: () => UseMutationResult<OrderDto, Error, CreateOrderItemInput & { orderId: string }>
  useUpdateMutation: () => UseMutationResult<OrderDto, Error, UpdateMyOrderItemInput & { orderId: string; itemId: string }>
  isLocked?: (item: OrderItemDto) => boolean
}) {
  const panel = useAddItemPanelState()
  const addItem = useAddMutation()
  const updateItem = useUpdateMutation()

  if (!panel.open) {
    return (
      <button type="button" className="btn-secondary self-start" onClick={() => panel.setOpen(true)}>
        Add item
      </button>
    )
  }

  function add(draft: DraftItem) {
    panel.setJustAdded(false)
    addItem.mutate(
      { orderId, ...draft.input },
      // Stay open on success - adding several items shouldn't mean reopening this panel once per
      // item. Also clear any stale error left over from the other mutation this panel can trigger.
      { onSuccess: () => { updateItem.reset(); panel.markAdded() } },
    )
  }

  function selectInventoryItem(item: InventoryItem) {
    // Already on this order - bump its quantity instead of adding a second row for the same item,
    // same dedup OrderItemBuilder does for a fresh order's draft list.
    const existing = items.find((orderItem) => orderItem.inventoryItemId === item.id)
    if (existing && !(isLocked?.(existing) ?? false)) {
      panel.setJustAdded(false)
      updateItem.mutate(
        { orderId, itemId: existing.id, ...preservedContentFields(existing), quantity: existing.quantity + 1 },
        { onSuccess: () => { addItem.reset(); panel.markAdded() } },
      )
    } else {
      add(draftFromInventoryItem(item))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <InventorySearch onSelect={selectInventoryItem} onCreateCustom={() => panel.setShowCustomForm(true)} onSearchTextChange={panel.setSearching} />

      {panel.showCustomForm ? (
        <CustomItemForm onAdd={add} />
      ) : (
        !panel.searching && (
          <button type="button" className="btn-secondary self-start" onClick={() => panel.setShowCustomForm(true)}>
            Can't find it? Create a custom request
          </button>
        )
      )}

      {panel.justAdded && !addItem.isPending && <p className="text-sm font-medium text-forest">Item added.</p>}

      <button type="button" className="btn-secondary self-start px-3 py-1.5 text-sm" onClick={panel.close}>
        Done
      </button>
      {(addItem.isError || updateItem.isError) && (
        <p className="error-text">{errorMessage(addItem.error ?? updateItem.error, 'Could not add item.')}</p>
      )}
    </div>
  )
}
