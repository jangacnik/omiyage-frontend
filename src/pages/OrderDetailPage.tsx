import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  isItemLocked,
  orderDisplayName,
  useAddMyOrderItem,
  useCancelMyOrder,
  useLeaveShipment,
  useOrder,
  useRemoveMyOrderItem,
  useSplitMyOrder,
  useSubmitForShipping,
  useUpdateMyOrderItem,
  useUpdateOrderNickname,
} from '../api/orders'
import { useConfirm } from '../components/ConfirmDialog'
import { OrderIdHint } from '../components/OrderIdHint'
import { OrderItemCard } from '../components/OrderItemCard'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Spinner, ButtonSpinner } from '../components/Spinner'
import { ImageDropInput } from '../components/ImageDropInput'
import { TrashIcon } from '../components/icons'
import type { OrderDto, OrderItemDto } from '../types/api'

function OrderNicknameEditor({ order }: { order: OrderDto }) {
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(order.nickname ?? '')
  const updateNickname = useUpdateOrderNickname()

  function save() {
    updateNickname.mutate(
      { orderId: order.id, nickname: nickname.trim() || null },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field-input sm:w-64"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={order.id.slice(0, 8)}
          aria-label="Order nickname"
          autoFocus
        />
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={save} disabled={updateNickname.isPending}>
          {updateNickname.isPending ? <ButtonSpinner /> : 'Save'}
        </button>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-sm"
          onClick={() => {
            setNickname(order.nickname ?? '')
            setEditing(false)
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <h1 className="page-title">
        Order {orderDisplayName(order)}
        <OrderIdHint id={order.id} nickname={order.nickname} />
      </h1>
      <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(true)}>
        Rename
      </button>
    </div>
  )
}

function EditableItem({ orderId, item, locked }: { orderId: string; item: OrderItemDto; locked: boolean }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [maxPrice, setMaxPrice] = useState(item.maxPrice?.toString() ?? '')
  const [quantity, setQuantity] = useState(item.quantity.toString())
  const [link, setLink] = useState(item.link ?? '')
  const [imageKey, setImageKey] = useState(item.imageKey ?? undefined)
  const updateItem = useUpdateMyOrderItem()
  const removeItem = useRemoveMyOrderItem()
  const confirm = useConfirm()
  // The backend also blocks this (item already bought/shipped, or the order itself is no longer
  // open) - these checks just keep the UI from offering a button that would 409.
  const editable = !locked && !isItemLocked(item)

  function save() {
    updateItem.mutate(
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
      { onSuccess: () => setEditing(false) },
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

  if (!editing) {
    return (
      <li className="py-3">
        <OrderItemCard item={item}>
          {editable && (
            <>
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button
                type="button"
                className="btn-danger px-2 py-1 text-xs"
                onClick={remove}
                disabled={removeItem.isPending}
              >
                {removeItem.isPending ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <TrashIcon size={13} /> Remove
                  </>
                )}
              </button>
            </>
          )}
        </OrderItemCard>
        {removeItem.isError && <p className="error-text mt-1">Could not remove this item.</p>}
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-mist p-3">
      <input
        className="field-input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label={`Title for ${item.title}`}
      />
      <textarea
        className="field-input"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label={`Description for ${item.title}`}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          step="0.01"
          placeholder="Max price (EUR)"
          className="field-input sm:w-32"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          aria-label={`Max price for ${item.title}`}
        />
        <label className="flex items-center gap-2 sm:w-24">
          <span className="text-sm text-ink/60">Qty</span>
          <input
            type="number"
            min={1}
            className="field-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label={`Quantity for ${item.title}`}
          />
        </label>
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
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={save} disabled={updateItem.isPending}>
          {updateItem.isPending ? <ButtonSpinner /> : 'Save'}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
      {updateItem.isError && <p className="error-text">Could not save changes.</p>}
    </li>
  )
}

function AddItemForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [condition, setCondition] = useState<'NEW' | 'USED'>('NEW')
  const [maxPrice, setMaxPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [link, setLink] = useState('')
  const addItem = useAddMyOrderItem()

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
        // Max price is always EUR - fixed by policy, not a per-item choice.
        currency: 'EUR',
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
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          step="0.01"
          placeholder="Max price in EUR (optional)"
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

function SplitItemsPanel({ order }: { order: OrderDto }) {
  const [selected, setSelected] = useState<string[]>([])
  const splitOrder = useSplitMyOrder()
  const navigate = useNavigate()

  function toggle(itemId: string) {
    setSelected((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]))
  }

  function submit() {
    splitOrder.mutate(
      { orderId: order.id, itemIds: selected },
      { onSuccess: (result) => navigate(`/orders/${result.created.id}`) },
    )
  }

  if (order.items.length < 2) return null

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-mist p-3">
      <p className="text-sm font-medium text-ink">Split items into a new order</p>
      <ul className="flex flex-col gap-1">
        {order.items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
            {item.title}
          </label>
        ))}
      </ul>
      <button
        type="button"
        className="btn-secondary self-start px-3 py-1.5 text-sm"
        onClick={submit}
        disabled={selected.length === 0 || selected.length === order.items.length || splitOrder.isPending}
      >
        {splitOrder.isPending ? <ButtonSpinner /> : 'Split selected into new order'}
      </button>
      {splitOrder.isError && <p className="error-text">Could not split these items.</p>}
    </div>
  )
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)
  const cancelOrder = useCancelMyOrder()
  const submitForShipping = useSubmitForShipping()
  const leaveShipment = useLeaveShipment()
  const confirm = useConfirm()

  if (isLoading) return <Spinner fullPage label="Fetching order" />
  if (isError || !order) return <p className="error-text">Order not found.</p>

  const hasLockedItem = order.items.some(isItemLocked)
  const hasPreorderItem = order.items.some((item) => item.isPreorder)

  async function handleCancel() {
    if (!order) return
    const ok = await confirm({
      title: 'Cancel order',
      message: 'Cancel this whole order? This cannot be undone.',
      confirmLabel: 'Cancel order',
      danger: true,
    })
    if (ok) cancelOrder.mutate(order.id)
  }

  async function handleSubmitForShipping() {
    if (!order) return
    const ok = await confirm({
      title: 'Submit for shipping',
      message: 'Submit for shipping? You (and anyone whose orders were combined with yours) will no longer be able to edit these orders.',
      confirmLabel: 'Submit',
    })
    if (ok) submitForShipping.mutate(order.id)
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <OrderNicknameEditor order={order} />
        <OrderStatusBadge status={order.status} />
      </div>
      {order.notes && <p className="text-ink/70">{order.notes}</p>}

      {!order.open ? (
        <p className="text-sm text-ink/50">
          This order is {order.status === 'CANCELLED' ? 'cancelled' : 'no longer open'} and can't be edited.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-sm"
            onClick={handleSubmitForShipping}
            disabled={submitForShipping.isPending || hasPreorderItem}
            title={hasPreorderItem ? 'This order has a preorder item that has not released yet - it cannot be submitted for shipping until it does.' : undefined}
          >
            {submitForShipping.isPending ? <ButtonSpinner /> : 'Submit for shipping'}
          </button>
          {order.shipmentId && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-sm"
              onClick={() => leaveShipment.mutate(order.id)}
              disabled={leaveShipment.isPending}
            >
              {leaveShipment.isPending ? <ButtonSpinner /> : 'Remove from shipment'}
            </button>
          )}
          <button type="button" className="btn-danger px-3 py-1.5 text-sm" onClick={handleCancel} disabled={cancelOrder.isPending || hasLockedItem}>
            {cancelOrder.isPending ? <ButtonSpinner /> : 'Cancel order'}
          </button>
        </div>
      )}
      {leaveShipment.isError && <p className="error-text">Could not remove this order from its shipment (it may have already shipped).</p>}
      {hasLockedItem && order.open && (
        <p className="text-sm text-ink/50">This order has items already bought or shipped, so it can no longer be cancelled as a whole.</p>
      )}
      {cancelOrder.isError && <p className="error-text">Could not cancel this order (it may have items already bought or shipped).</p>}
      {submitForShipping.isError && (
        <p className="error-text">Could not submit for shipping (only the shipment's owner can do this).</p>
      )}

      <ul className="flex flex-col divide-y divide-mist">
        {order.items.map((item) => (
          <EditableItem key={item.id} orderId={order.id} item={item} locked={!order.open} />
        ))}
      </ul>

      {order.open && <AddItemForm orderId={order.id} />}
      {order.open && <SplitItemsPanel order={order} />}
    </div>
  )
}
