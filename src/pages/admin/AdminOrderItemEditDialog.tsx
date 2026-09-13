import { useState } from 'react'
import { useAdminUpdateOrderItemContent, useUpdateOrderItem } from '../../api/adminOrders'
import { ImageDropInput } from '../../components/ImageDropInput'
import { ORDER_ITEM_STATUSES } from '../../components/OrderItemStatusBadge'
import { ButtonSpinner } from '../../components/Spinner'
import type { Currency, OrderItemDto, OrderItemStatus } from '../../types/api'

const CURRENCIES: Currency[] = ['JPY', 'EUR']

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
  const [actualPriceCurrency, setActualPriceCurrency] = useState<Currency>(item.actualPriceCurrency ?? item.currency)
  const [soldPrice, setSoldPrice] = useState(item.soldPrice?.toString() ?? '')
  const [soldPriceCurrency, setSoldPriceCurrency] = useState<Currency>(item.soldPriceCurrency ?? item.currency)
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
          actualPriceCurrency: actualPrice ? actualPriceCurrency : undefined,
          soldPrice: soldPrice ? Number(soldPrice) : undefined,
          soldPriceCurrency: soldPrice ? soldPriceCurrency : undefined,
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

        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <textarea className="field-input" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field-input sm:w-32"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Max price"
            placeholder="Max price"
          />
          <input
            className="field-input sm:w-24"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label="Quantity"
            placeholder="Qty"
          />
        </div>

        <input
          type="url"
          className="field-input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link to store page (optional)"
          aria-label="Link"
        />

        <ImageDropInput label="Photo" initialImageKey={item.imageKey ?? undefined} onUploaded={setImageKey} />

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Status</span>
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
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-ink/50">Bought for (how much I paid for the item)</span>
            <div className="flex gap-1">
              <input
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                aria-label="Bought for"
                className="field-input"
              />
              <select
                value={actualPriceCurrency}
                onChange={(e) => setActualPriceCurrency(e.target.value as Currency)}
                aria-label="Bought for currency"
                className="field-input w-20"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-ink/50">Sold for (how much I charged for it)</span>
            <div className="flex gap-1">
              <input
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                aria-label="Sold for"
                className="field-input"
              />
              <select
                value={soldPriceCurrency}
                onChange={(e) => setSoldPriceCurrency(e.target.value as Currency)}
                aria-label="Sold for currency"
                className="field-input w-20"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Weight (g)</span>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Weight" className="field-input sm:w-32" />
        </label>

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
