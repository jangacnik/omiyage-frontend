import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { useConfirm } from '../components/confirmContext'
import { ErrorState } from '../components/ErrorState'
import { Modal } from '../components/Modal'
import { OrderIdHint } from '../components/OrderIdHint'
import { OrderItemCard } from '../components/OrderItemCard'
import { AddItemPanel } from '../components/OrderItemBuilder'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Spinner, ButtonSpinner } from '../components/Spinner'
import { Field } from '../components/Field'
import { ImageDropInput } from '../components/ImageDropInput'
import { QuantityStepper } from '../components/QuantityStepper'
import { IconButton } from '../components/IconButton'
import { CheckIcon, CloseIcon, EditIcon, TrashIcon } from '../components/icons'
import { ApiError, errorMessage } from '../lib/apiClient'
import { formatMoney } from '../lib/currency'
import type { OrderDto, OrderItemDto } from '../types/api'

/** soldPrice is what's actually charged; an item not priced yet (still a bare request) falls back
 *  to the max the member set, so the total reads as an estimate rather than silently excluding it.
 *  soldPrice/maxPrice are always EUR by policy (see OrderService.buildOrderItem/updateItem on the
 *  backend) - same assumption AdminShipmentsPage.orderItemsTotalEur makes, so no per-item currency
 *  conversion is needed here either. */
function OrderTotal({ order }: { order: OrderDto }) {
  const total = order.items.reduce((sum, item) => sum + (item.soldPrice ?? item.maxPrice ?? 0) * item.quantity, 0)
  const unpricedCount = order.items.filter((item) => item.soldPrice == null).length

  return (
    <div className="flex items-center justify-between border-t border-mist pt-3">
      <div>
        {/* "Items total" (not "Order total") - distinct from a shipment's grand total, which adds
            this order's shipping cost share on top (see MyShipmentPage's total). */}
        <p className="text-sm text-muted">Items total</p>
        {unpricedCount > 0 && (
          <p className="text-xs text-muted">
            Estimated - {unpricedCount} item{unpricedCount === 1 ? '' : 's'} not priced yet, using the max you set
          </p>
        )}
      </div>
      <p className="text-lg font-semibold text-ink">{formatMoney(total, 'EUR')}</p>
    </div>
  )
}

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
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Order name" className="w-full sm:w-64">
          <input
            className="field-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={order.id.slice(0, 8)}
            aria-label="Order name"
            autoFocus
          />
        </Field>
        <IconButton
          variant="primary"
          label="Save"
          onClick={save}
          disabled={updateNickname.isPending}
          icon={updateNickname.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
        />
        <IconButton
          label="Cancel"
          onClick={() => {
            setNickname(order.nickname ?? '')
            setEditing(false)
          }}
          icon={<CloseIcon size={14} />}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <h1 className="page-title">
        Order {orderDisplayName(order)}
        <OrderIdHint id={order.id} nickname={order.nickname} />
      </h1>
      <IconButton label="Rename" onClick={() => setEditing(true)} icon={<EditIcon size={14} />} />
    </div>
  )
}

function EditableItem({ orderId, item, locked }: { orderId: string; item: OrderItemDto; locked: boolean }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [maxPrice, setMaxPrice] = useState(item.maxPrice?.toString() ?? '')
  const [quantity, setQuantity] = useState(item.quantity)
  const [link, setLink] = useState(item.link ?? '')
  const [imageKey, setImageKey] = useState(item.imageKey ?? undefined)
  const updateItem = useUpdateMyOrderItem()
  const removeItem = useRemoveMyOrderItem()
  const confirm = useConfirm()
  // The backend also blocks this (item already bought/shipped, or the order itself is no longer
  // open) - these checks just keep the UI from offering a button that would 409.
  const editable = !locked && !isItemLocked(item)

  function save(e: React.FormEvent) {
    e.preventDefault()
    updateItem.mutate(
      {
        orderId,
        itemId: item.id,
        title,
        description,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        quantity,
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

  return (
    <li className="py-3">
      <OrderItemCard item={item}>
        {editable && (
          <>
            <IconButton label="Edit" onClick={() => setEditing(true)} icon={<EditIcon size={14} />} />
            <IconButton
              variant="danger"
              label="Remove"
              onClick={remove}
              disabled={removeItem.isPending}
              icon={removeItem.isPending ? <ButtonSpinner /> : <TrashIcon size={14} />}
            />
          </>
        )}
      </OrderItemCard>
      {removeItem.isError && (
        <p className="error-text mt-1">{errorMessage(removeItem.error, 'Could not remove this item.')}</p>
      )}
      {editing && (
        <Modal onClose={() => setEditing(false)} labelledBy={`edit-order-item-${item.id}-title`}>
          <form
            onSubmit={save}
            className="card flex max-h-[90vh] w-full max-w-lg flex-col gap-2 overflow-y-auto"
          >
            <h2 id={`edit-order-item-${item.id}-title`} className="page-title mb-1 text-lg">
              Edit item
            </h2>
            <Field label="Title">
              <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
            </Field>
            <Field label="Description" hint="Optional">
              <textarea
                className="field-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-label="Description"
              />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Field label="Max price" hint="In EUR" className="sm:w-32">
                <input
                  type="number"
                  step="0.01"
                  className="field-input"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  aria-label="Max price"
                />
              </Field>
              <Field label="Qty" className="sm:w-24">
                <QuantityStepper quantity={quantity} onChange={setQuantity} label="Quantity" />
              </Field>
            </div>
            <Field label="Link to store page" hint="Optional">
              <input
                type="url"
                className="field-input"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                aria-label="Link to store page"
              />
            </Field>
            <ImageDropInput label="Photo" initialImageKey={item.imageKey ?? undefined} onUploaded={setImageKey} />
            <div className="flex gap-2">
              <IconButton
                type="submit"
                variant="primary"
                label="Save"
                disabled={updateItem.isPending}
                icon={updateItem.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
              />
              <IconButton label="Cancel" onClick={() => setEditing(false)} icon={<CloseIcon size={14} />} />
            </div>
            {updateItem.isError && (
              <p className="error-text">{errorMessage(updateItem.error, 'Could not save changes.')}</p>
            )}
          </form>
        </Modal>
      )}
    </li>
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
      {selected.length === order.items.length && (
        <p className="text-xs text-muted">Leave at least one item behind - selecting everything would just move the whole order.</p>
      )}
      {splitOrder.isError && (
        <p className="error-text">{errorMessage(splitOrder.error, 'Could not split these items.')}</p>
      )}
    </div>
  )
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError, error, refetch, isRefetching } = useOrder(id)
  const cancelOrder = useCancelMyOrder()
  const submitForShipping = useSubmitForShipping()
  const leaveShipment = useLeaveShipment()
  const confirm = useConfirm()

  if (isLoading) return <Spinner fullPage label="Fetching order" />
  if (isError && !(error instanceof ApiError && error.status === 404)) {
    return <ErrorState message="Could not load this order." onRetry={() => refetch()} isRetrying={isRefetching} />
  }
  if (!order) {
    return (
      <div className="card flex flex-col items-center gap-2 py-12 text-center">
        <p className="error-text">Order not found.</p>
        <Link to="/orders" className="btn-secondary mt-2">
          Back to my orders
        </Link>
      </div>
    )
  }

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

  async function handleLeaveShipment() {
    if (!order) return
    const ok = await confirm({
      title: 'Remove from shipment',
      message: "Remove this order from its shipment? It goes back to being shipped on its own, which changes everyone else's shipping cost share.",
      confirmLabel: 'Remove',
    })
    if (ok) leaveShipment.mutate(order.id)
  }

  return (
    <div className="card flex flex-col gap-3">
      <Link to="/orders" className="self-start text-sm text-muted hover:text-forest">
        ← My orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <OrderNicknameEditor order={order} />
        <OrderStatusBadge status={order.status} />
      </div>
      {order.notes && <p className="text-ink/70">{order.notes}</p>}

      {!order.open ? (
        <p className="text-sm text-muted">
          This order is {order.status === 'CANCELLED' ? 'cancelled' : 'no longer open'} and can't be edited.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-sm"
            onClick={handleSubmitForShipping}
            disabled={submitForShipping.isPending || hasPreorderItem}
          >
            {submitForShipping.isPending ? <ButtonSpinner /> : 'Submit for shipping'}
          </button>
          {order.shipmentId && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-sm"
              onClick={handleLeaveShipment}
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
      {hasPreorderItem && order.open && (
        <p className="text-sm text-muted">
          This order has a preorder item that hasn't released yet, so it can't be submitted for shipping until it does.
          {order.items.length > 1
            ? ' Split the preorder item into its own order below to ship the rest now.'
            : ''}
        </p>
      )}
      {leaveShipment.isError && (
        <p className="error-text">
          {errorMessage(leaveShipment.error, 'Could not remove this order from its shipment (it may have already shipped).')}
        </p>
      )}
      {hasLockedItem && order.open && (
        <p className="text-sm text-muted">This order has items already bought or shipped, so it can no longer be cancelled as a whole.</p>
      )}
      {cancelOrder.isError && (
        <p className="error-text">
          {errorMessage(cancelOrder.error, 'Could not cancel this order (it may have items already bought or shipped).')}
        </p>
      )}
      {submitForShipping.isError && (
        <p className="error-text">
          {errorMessage(submitForShipping.error, "Could not submit for shipping (only the shipment's owner can do this).")}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-mist">
        {order.items.map((item) => (
          <EditableItem key={item.id} orderId={order.id} item={item} locked={!order.open} />
        ))}
      </ul>

      <OrderTotal order={order} />

      {order.open && (
        <AddItemPanel
          orderId={order.id}
          items={order.items}
          useAddMutation={useAddMyOrderItem}
          useUpdateMutation={useUpdateMyOrderItem}
          isLocked={isItemLocked}
        />
      )}
      {order.open && <SplitItemsPanel order={order} />}
    </div>
  )
}
