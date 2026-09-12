import { useState } from 'react'
import {
  useAdminAddOrderItem,
  useAdminMarkItemPaid,
  useAdminRemoveOrderItem,
  useAdminUpdateOrderItemContent,
  useUpdateOrderItem,
  useUpdateOrderStatus,
} from '../../api/adminOrders'
import { useConfirm } from '../../components/ConfirmDialog'
import { ImageDropInput } from '../../components/ImageDropInput'
import { OrderItemCard } from '../../components/OrderItemCard'
import { ORDER_ITEM_STATUSES } from '../../components/OrderItemStatusBadge'
import { ButtonSpinner } from '../../components/Spinner'
import { TrashIcon } from '../../components/icons'
import type { OrderDto, OrderItemDto, OrderItemStatus, OrderStatus } from '../../types/api'

const STATUSES: OrderStatus[] = [
  'REQUESTED',
  'IN_PROGRESS',
  'PURCHASED',
  'PREPARING_SHIPPING',
  'SENT',
  'DELIVERED',
  'CANCELLED',
]

function AdminItemRow({ orderId, item }: { orderId: string; item: OrderItemDto }) {
  const [editingContent, setEditingContent] = useState(false)
  const [actualPrice, setActualPrice] = useState(item.actualPrice?.toString() ?? '')
  const [weight, setWeight] = useState(item.weight?.toString() ?? '')
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [maxPrice, setMaxPrice] = useState(item.maxPrice?.toString() ?? '')
  const [quantity, setQuantity] = useState(item.quantity.toString())
  const [link, setLink] = useState(item.link ?? '')
  const [imageKey, setImageKey] = useState(item.imageKey ?? undefined)
  const updateItem = useUpdateOrderItem()
  const updateContent = useAdminUpdateOrderItemContent()
  const removeItem = useAdminRemoveOrderItem()
  const markPaid = useAdminMarkItemPaid()
  const confirm = useConfirm()

  function save(status: OrderItemStatus) {
    updateItem.mutate({
      orderId,
      itemId: item.id,
      status,
      actualPrice: actualPrice ? Number(actualPrice) : undefined,
      weight: weight ? Number(weight) : undefined,
    })
  }

  function saveContent() {
    updateContent.mutate(
      {
        orderId,
        itemId: item.id,
        title,
        description,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        quantity: quantity ? Number(quantity) : undefined,
        link: link || undefined,
        imageKey,
      },
      { onSuccess: () => setEditingContent(false) },
    )
  }

  async function remove() {
    const ok = await confirm({
      title: 'Remove item',
      message: `Remove "${item.title}" from this order?`,
      confirmLabel: 'Remove',
      danger: true,
    })
    if (ok) removeItem.mutate({ orderId, itemId: item.id })
  }

  if (editingContent) {
    return (
      <li className="flex flex-col gap-2 py-4">
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label={`Title for ${item.title}`} />
        <textarea
          className="field-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label={`Description for ${item.title}`}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field-input sm:w-32"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label={`Max price for ${item.title}`}
          />
          <input
            className="field-input sm:w-24"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label={`Quantity for ${item.title}`}
          />
        </div>
        <input
          type="url"
          className="field-input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link to store page (optional)"
          aria-label={`Link for ${item.title}`}
        />
        <ImageDropInput label="Photo" initialImageKey={item.imageKey ?? undefined} onUploaded={setImageKey} />
        <div className="flex gap-2">
          <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={saveContent} disabled={updateContent.isPending}>
            {updateContent.isPending ? <ButtonSpinner /> : 'Save'}
          </button>
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditingContent(false)}>
            Cancel
          </button>
        </div>
        {updateContent.isError && <p className="error-text">Could not save changes.</p>}
      </li>
    )
  }

  return (
    <li className="py-4">
      <OrderItemCard item={item}>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink/50">Buy price</span>
              <input
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                aria-label={`Buy price for ${item.title}`}
                className="field-input w-28 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink/50">Weight (g)</span>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                aria-label={`Weight for ${item.title}`}
                className="field-input w-24 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink/50">Status</span>
              <select
                value={item.status}
                onChange={(e) => save(e.target.value as OrderItemStatus)}
                aria-label={`Status for ${item.title}`}
                className="field-input w-32 py-1"
              >
                {ORDER_ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => save(item.status)}
              disabled={updateItem.isPending}
            >
              {updateItem.isPending ? <ButtonSpinner /> : 'Save price/weight'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => markPaid.mutate({ orderId, itemId: item.id, paid: !item.paid })}
              disabled={markPaid.isPending}
            >
              {markPaid.isPending ? <ButtonSpinner /> : item.paid ? 'Mark unpaid' : 'Mark paid'}
            </button>
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditingContent(true)}>
              Edit
            </button>
            <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={remove} disabled={removeItem.isPending}>
              {removeItem.isPending ? <ButtonSpinner /> : (
                <>
                  <TrashIcon size={13} /> Remove
                </>
              )}
            </button>
          </div>
          {(updateItem.isError || removeItem.isError || markPaid.isError) && (
            <p className="error-text">
              {updateItem.isError && 'Could not save price/weight/status. '}
              {removeItem.isError && 'Could not remove this item. '}
              {markPaid.isError && 'Could not update paid status.'}
            </p>
          )}
        </div>
      </OrderItemCard>
    </li>
  )
}

function AdminAddItemForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [condition, setCondition] = useState<'NEW' | 'USED'>('NEW')
  const [currency, setCurrency] = useState<'JPY' | 'EUR'>('JPY')
  const [maxPrice, setMaxPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [link, setLink] = useState('')
  const addItem = useAdminAddOrderItem()

  if (!open) {
    return (
      <button type="button" className="btn-secondary self-start" onClick={() => setOpen(true)}>
        Add item
      </button>
    )
  }

  function submit() {
    if (!title.trim()) return
    addItem.mutate(
      {
        orderId,
        title,
        condition,
        currency,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        quantity: quantity ? Number(quantity) : 1,
        link: link || undefined,
      },
      {
        onSuccess: () => {
          setTitle('')
          setMaxPrice('')
          setQuantity('1')
          setLink('')
          setOpen(false)
        },
      },
    )
  }

  return (
    <div className="card flex flex-col gap-2">
      <input placeholder="Title" className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={condition} onChange={(e) => setCondition(e.target.value as 'NEW' | 'USED')} className="field-input" aria-label="Condition">
          <option value="NEW">New</option>
          <option value="USED">Used</option>
        </select>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as 'JPY' | 'EUR')} className="field-input" aria-label="Currency">
          <option value="JPY">JPY</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          step="0.01"
          placeholder="Max price (optional)"
          className="field-input"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          aria-label="Max price"
        />
        <label className="flex items-center gap-2 sm:w-32">
          <span className="text-sm text-ink/60">Qty</span>
          <input
            type="number"
            min={1}
            className="field-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label="Quantity"
          />
        </label>
      </div>
      <input
        type="url"
        placeholder="Link to store page (optional)"
        className="field-input"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        aria-label="Link to store page"
      />
      <div className="flex gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={submit} disabled={addItem.isPending || !title.trim()}>
          {addItem.isPending ? <ButtonSpinner /> : 'Add item'}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {addItem.isError && <p className="error-text">Could not add item.</p>}
    </div>
  )
}

/** Order status select + item rows + add-item form - the admin's unrestricted order-editing
 *  surface, shared by the full order detail page and the inline editor on the shipment page. */
export function AdminOrderEditor({ order }: { order: OrderDto }) {
  const updateStatus = useUpdateOrderStatus()

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="field-label">Order status</span>
        <span className="flex items-center gap-2">
          <select
            value={order.status}
            onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })}
            aria-label="Update order status"
            className="field-input max-w-xs"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {updateStatus.isPending && <ButtonSpinner />}
        </span>
      </label>

      <ul className="card divide-y divide-mist">
        {order.items.map((item) => (
          <AdminItemRow key={item.id} orderId={order.id} item={item} />
        ))}
      </ul>

      <AdminAddItemForm orderId={order.id} />
    </div>
  )
}
