import { useState } from 'react'
import { useAdminUpdateOrderItemContent, useUpdateOrderItem } from '../../api/adminOrders'
import { Field } from '../../components/Field'
import { ImageDropInput } from '../../components/ImageDropInput'
import { QuantityStepper } from '../../components/QuantityStepper'
import { ORDER_ITEM_STATUSES } from '../../components/OrderItemStatusBadge'
import { ButtonSpinner } from '../../components/Spinner'
import { IconButton } from '../../components/IconButton'
import { CheckIcon, CloseIcon } from '../../components/icons'
import type { OrderItemDto, OrderItemStatus } from '../../types/api'

export function AdminOrderItemEditDialog({
  orderId,
  item,
  onClose,
}: {
  orderId: string
  item: OrderItemDto
  onClose: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [maxPrice, setMaxPrice] = useState(item.maxPrice?.toString() ?? '')
  const [quantity, setQuantity] = useState(item.quantity)
  const [link, setLink] = useState(item.link ?? '')
  const [imageKey, setImageKey] = useState(item.imageKey ?? undefined)
  const [status, setStatus] = useState<OrderItemStatus>(item.status)
  const [actualPrice, setActualPrice] = useState(item.actualPrice?.toString() ?? '')
  const [soldPrice, setSoldPrice] = useState(item.soldPrice?.toString() ?? '')
  const [weight, setWeight] = useState(item.weight?.toString() ?? '')

  const updateContent = useAdminUpdateOrderItemContent()
  const updateItem = useUpdateOrderItem()
  const saving = updateContent.isPending || updateItem.isPending

  async function save() {
    // allSettled, not all - these are two independent PATCHes (details vs status/price/weight).
    // One can succeed while the other 400s on bad input; with Promise.all a single rejection would
    // still leave the other's mutation already committed server-side, but reporting it here as an
    // undifferentiated failure. Settling both first means each mutation's own isError flag below
    // reflects reality, and only closes the dialog once everything actually saved.
    const [contentResult, itemResult] = await Promise.allSettled([
      updateContent.mutateAsync({
        orderId,
        itemId: item.id,
        title,
        description,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        quantity,
        link: link || undefined,
        imageKey,
      }),
      updateItem.mutateAsync({
        orderId,
        itemId: item.id,
        status,
        actualPrice: actualPrice ? Number(actualPrice) : undefined,
        soldPrice: soldPrice ? Number(soldPrice) : undefined,
        weight: weight ? Number(weight) : undefined,
      }),
    ])
    if (contentResult.status === 'fulfilled' && itemResult.status === 'fulfilled') onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-item-title"
        className="card flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-item-title" className="page-title text-lg">
          Edit item
        </h2>

        <Field label="Title">
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        </Field>

        <Field label="Description" hint="Optional">
          <textarea className="field-input" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Max price" hint="In EUR">
            <input
              type="number"
              step="0.01"
              className="field-input"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Max price, in EUR"
            />
          </Field>
          <Field label="Quantity">
            <QuantityStepper quantity={quantity} onChange={setQuantity} label="Quantity" />
          </Field>
        </div>

        <Field label="Link to store page" hint="Optional">
          <input
            type="url"
            className="field-input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            aria-label="Link"
          />
        </Field>

        <ImageDropInput label="Photo" initialImageKey={item.imageKey ?? undefined} onUploaded={setImageKey} />

        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderItemStatus)}
            aria-label="Status"
            className="field-input"
          >
            {ORDER_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        {/* Distinct tinted box: this pair is easy to mix up under time pressure since they sit right
            next to each other in the same layout as maxPrice/quantity above - one is our internal
            cost (never customer-visible), the other is what the customer is actually charged. */}
        <div className="flex flex-col gap-3 rounded-lg bg-mist/60 p-3">
          <p className="text-xs font-medium text-ink/50">Money - what we paid vs. what the customer pays</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Bought for" hint="In JPY - internal only, never shown to the customer">
              <input
                type="number"
                step="1"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                aria-label="Bought for, in JPY"
                className="field-input"
              />
            </Field>

            <Field label="Sold for" hint="In EUR - what the customer is charged">
              <input
                type="number"
                step="0.01"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                aria-label="Sold for, in EUR"
                className="field-input"
              />
            </Field>
          </div>
        </div>

        <Field label="Weight" hint="In grams">
          <input type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Weight" className="field-input" />
        </Field>

        {updateContent.isError && <p className="error-text">Could not save the item details (title, description, price, link, photo).</p>}
        {updateItem.isError && <p className="error-text">Could not save the status/pricing/weight change.</p>}

        <div className="sticky bottom-0 -mx-4 -mb-4 mt-1 flex justify-end gap-2 border-t border-mist bg-surface px-4 py-3">
          <IconButton label="Cancel" onClick={onClose} icon={<CloseIcon size={14} />} />
          <IconButton
            variant="primary"
            label="Save"
            onClick={save}
            disabled={saving}
            icon={saving ? <ButtonSpinner /> : <CheckIcon size={14} />}
          />
        </div>
      </div>
    </div>
  )
}
