import { useState } from 'react'
import { useAdminUpdateOrderItemContent, useUpdateOrderItem } from '../../api/adminOrders'
import { Field } from '../../components/Field'
import { ImageDropInput } from '../../components/ImageDropInput'
import { ORDER_ITEM_STATUSES } from '../../components/OrderItemStatusBadge'
import { ButtonSpinner } from '../../components/Spinner'
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
  const [quantity, setQuantity] = useState(item.quantity.toString())
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
    try {
      await Promise.all([
        updateContent.mutateAsync({
          orderId,
          itemId: item.id,
          title,
          description,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          quantity: quantity ? Number(quantity) : undefined,
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
      onClose()
    } catch {
      // isError below renders the message - stay open so the admin can retry.
    }
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
            <input
              type="number"
              min={1}
              className="field-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-label="Quantity"
            />
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bought for" hint="In JPY - how much I paid for the item">
            <input
              type="number"
              step="1"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              aria-label="Bought for, in JPY"
              className="field-input"
            />
          </Field>

          <Field label="Sold for" hint="In EUR - how much I charged for it">
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

        <Field label="Weight" hint="In grams">
          <input type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Weight" className="field-input" />
        </Field>

        {(updateContent.isError || updateItem.isError) && <p className="error-text">Could not save changes.</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={save} disabled={saving}>
            {saving ? <ButtonSpinner /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
