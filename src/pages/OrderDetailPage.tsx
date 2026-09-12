import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useOrder, useUpdateMyOrderItem } from '../api/orders'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../components/Spinner'
import { ImageDropInput } from '../components/ImageDropInput'
import { mediaUrl } from '../lib/media'
import type { OrderItemDto, OrderStatus } from '../types/api'

const EDITABLE_STATUSES: OrderStatus[] = ['REQUESTED', 'IN_PROGRESS']

function EditableItem({ orderId, item, editable }: { orderId: string; item: OrderItemDto; editable: boolean }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [maxPrice, setMaxPrice] = useState(item.maxPrice?.toString() ?? '')
  const [quantity, setQuantity] = useState(item.quantity.toString())
  const [imageKey, setImageKey] = useState(item.imageKey ?? undefined)
  const updateItem = useUpdateMyOrderItem()

  function save() {
    updateItem.mutate(
      {
        orderId,
        itemId: item.id,
        title,
        description,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        quantity: quantity ? Number(quantity) : undefined,
        imageKey,
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (!editing) {
    return (
      <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-light">
            {item.imageKey && <img src={mediaUrl(item.imageKey)} alt="" className="h-full w-full object-cover" />}
          </div>
          <div>
            <p className="font-medium text-ink">{item.title}</p>
            <p className="text-sm text-ink/60">
              {item.currency} {item.maxPrice ?? '—'} max / {item.actualPrice ?? '—'} paid · qty {item.quantity}
            </p>
            <div className="mt-1">
              <OrderItemStatusBadge status={item.status} />
            </div>
          </div>
        </div>
        {editable && (
          <button type="button" className="btn-secondary self-start px-2 py-1 text-xs" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-stone-light p-3">
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
      <ImageDropInput label="Photo" initialImageKey={item.imageKey ?? undefined} onUploaded={setImageKey} />
      <div className="flex gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={save} disabled={updateItem.isPending}>
          {updateItem.isPending ? <ButtonSpinner /> : 'Save'}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </li>
  )
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)

  if (isLoading) return <Spinner fullPage label="Fetching order" />
  if (isError || !order) return <p className="error-text">Order not found.</p>

  const editable = EDITABLE_STATUSES.includes(order.status)

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Order {order.id.slice(0, 8)}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.notes && <p className="text-ink/70">{order.notes}</p>}
      {!editable && <p className="text-sm text-ink/50">This order is no longer editable.</p>}

      <ul className="flex flex-col divide-y divide-stone-light">
        {order.items.map((item) => (
          <EditableItem key={item.id} orderId={order.id} item={item} editable={editable} />
        ))}
      </ul>
    </div>
  )
}
