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
import { CustomItemForm, InventorySearch, draftFromInventoryItem, preservedContentFields, useAddItemPanelState, type DraftItem } from '../components/OrderItemBuilder'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Spinner, ButtonSpinner } from '../components/Spinner'
import { Field } from '../components/Field'
import { ImageDropInput } from '../components/ImageDropInput'
import { TrashIcon } from '../components/icons'
import { errorMessage } from '../lib/apiClient'
import { formatMoney } from '../lib/currency'
import type { InventoryItem, OrderDto, OrderItemDto } from '../types/api'

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
        <p className="text-sm text-ink/60">Items total</p>
        {unpricedCount > 0 && (
          <p className="text-xs text-ink/45">
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
        <Field label="Order nickname" className="w-full sm:w-64">
          <input
            className="field-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={order.id.slice(0, 8)}
            aria-label="Order nickname"
            autoFocus
          />
        </Field>
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
        {removeItem.isError && (
          <p className="error-text mt-1">{errorMessage(removeItem.error, 'Could not remove this item.')}</p>
        )}
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-mist p-3">
      <Field label="Title">
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label={`Title for ${item.title}`} />
      </Field>
      <Field label="Description" hint="Optional">
        <textarea
          className="field-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label={`Description for ${item.title}`}
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
            aria-label={`Max price for ${item.title}`}
          />
        </Field>
        <Field label="Qty" className="sm:w-24">
          <input
            type="number"
            min={1}
            className="field-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label={`Quantity for ${item.title}`}
          />
        </Field>
      </div>
      <Field label="Link to store page" hint="Optional">
        <input
          type="url"
          className="field-input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-label={`Link for ${item.title}`}
        />
      </Field>
      <ImageDropInput label="Photo" initialImageKey={item.imageKey ?? undefined} onUploaded={setImageKey} />
      <div className="flex gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={save} disabled={updateItem.isPending}>
          {updateItem.isPending ? <ButtonSpinner /> : 'Save'}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
      {updateItem.isError && (
        <p className="error-text">{errorMessage(updateItem.error, 'Could not save changes.')}</p>
      )}
    </li>
  )
}

function AddItemForm({ orderId, items }: { orderId: string; items: OrderItemDto[] }) {
  const panel = useAddItemPanelState()
  const addItem = useAddMyOrderItem()
  const updateItem = useUpdateMyOrderItem()

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
      // Stay open on success - adding several items to an existing order shouldn't mean reopening
      // this panel once per item, same as the fresh-order builder already lets you keep going.
      // Also clear any stale error left over from the other mutation this panel can trigger, so a
      // fresh success never renders next to old error text.
      { onSuccess: () => { updateItem.reset(); panel.markAdded() } },
    )
  }

  function selectInventoryItem(item: InventoryItem) {
    // Already on this order - bump its quantity instead of adding a second row for the same item,
    // same dedup OrderItemBuilder does for a fresh order's draft list. A locked (bought/shipped)
    // item can't take this PATCH at all (backend 409s), so fall through to a plain add for that
    // case rather than surface a confusing error.
    const existing = items.find((orderItem) => orderItem.inventoryItemId === item.id)
    if (existing && !isItemLocked(existing)) {
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
        <p className="text-xs text-ink/50">Leave at least one item behind - selecting everything would just move the whole order.</p>
      )}
      {splitOrder.isError && (
        <p className="error-text">{errorMessage(splitOrder.error, 'Could not split these items.')}</p>
      )}
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
        <p className="text-sm text-ink/50">
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
        <p className="text-sm text-ink/50">This order has items already bought or shipped, so it can no longer be cancelled as a whole.</p>
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

      {order.open && <AddItemForm orderId={order.id} items={order.items} />}
      {order.open && <SplitItemsPanel order={order} />}
    </div>
  )
}
