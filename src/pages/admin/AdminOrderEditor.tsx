import { useState } from 'react'
import {
  useAdminAddOrderItem,
  useAdminMarkItemPaid,
  useAdminMarkOrderPaid,
  useAdminMoveOrderItems,
  useAdminOrdersForUser,
  useAdminRemoveOrderItem,
  useAdminUpdateOrderNickname,
  useUpdateOrderStatus,
} from '../../api/adminOrders'
import { useConfirm } from '../../components/ConfirmDialog'
import { Field } from '../../components/Field'
import { OrderItemCard } from '../../components/OrderItemCard'
import { CustomItemForm, InventorySearch, draftFromInventoryItem, type DraftItem } from '../../components/OrderItemBuilder'
import { ButtonSpinner } from '../../components/Spinner'
import { TrashIcon } from '../../components/icons'
import { formatMoney } from '../../lib/currency'
import { AdminOrderItemEditDialog } from './AdminOrderItemEditDialog'
import type { OrderDto, OrderItemDto, OrderStatus } from '../../types/api'

const STATUSES: OrderStatus[] = [
  'REQUESTED',
  'IN_PROGRESS',
  'PURCHASED',
  'PREPARING_SHIPPING',
  'SENT',
  'DELIVERED',
  'CANCELLED',
]

function AdminMoveItemDialog({
  orderId,
  userId,
  item,
  onClose,
}: {
  orderId: string
  userId: string
  item: OrderItemDto
  onClose: () => void
}) {
  const { data: userOrders } = useAdminOrdersForUser(userId)
  const [targetOrderId, setTargetOrderId] = useState('')
  const moveItems = useAdminMoveOrderItems()
  const otherOrders = (userOrders ?? []).filter((o) => o.id !== orderId)

  function move() {
    moveItems.mutate(
      { orderId, itemIds: [item.id], targetOrderId: targetOrderId || undefined },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-item-title"
        className="card flex w-full max-w-sm flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="move-item-title" className="page-title text-lg">
          Move &quot;{item.title}&quot;
        </h2>
        <label className="flex flex-col gap-1">
          <span className="field-label">Move to</span>
          <select
            value={targetOrderId}
            onChange={(e) => setTargetOrderId(e.target.value)}
            aria-label="Move to order"
            className="field-input"
          >
            <option value="">New order</option>
            {otherOrders.map((o) => (
              <option key={o.id} value={o.id}>
                Order {o.id.slice(0, 8)} ({o.status})
              </option>
            ))}
          </select>
        </label>
        {moveItems.isError && <p className="error-text">Could not move this item.</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={move} disabled={moveItems.isPending}>
            {moveItems.isPending ? <ButtonSpinner /> : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminItemRow({ orderId, userId, item }: { orderId: string; userId: string; item: OrderItemDto }) {
  const [editing, setEditing] = useState(false)
  const [moving, setMoving] = useState(false)
  const removeItem = useAdminRemoveOrderItem()
  const markPaid = useAdminMarkItemPaid()
  const confirm = useConfirm()

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
    <li className="py-4">
      <OrderItemCard item={item}>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => markPaid.mutate({ orderId, itemId: item.id, paid: !item.paid })}
              disabled={markPaid.isPending}
            >
              {markPaid.isPending ? <ButtonSpinner /> : item.paid ? 'Mark unpaid' : 'Mark paid'}
            </button>
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setMoving(true)}>
              Move
            </button>
            <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={remove} disabled={removeItem.isPending}>
              {removeItem.isPending ? <ButtonSpinner /> : (
                <>
                  <TrashIcon size={13} /> Remove
                </>
              )}
            </button>
          </div>
          {(removeItem.isError || markPaid.isError) && (
            <p className="error-text">
              {removeItem.isError && 'Could not remove this item. '}
              {markPaid.isError && 'Could not update paid status.'}
            </p>
          )}
        </div>
      </OrderItemCard>
      {editing && <AdminOrderItemEditDialog orderId={orderId} item={item} onClose={() => setEditing(false)} />}
      {moving && <AdminMoveItemDialog orderId={orderId} userId={userId} item={item} onClose={() => setMoving(false)} />}
    </li>
  )
}

function AdminAddItemForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const addItem = useAdminAddOrderItem()

  if (!open) {
    return (
      <button type="button" className="btn-secondary self-start" onClick={() => setOpen(true)}>
        Add item
      </button>
    )
  }

  function add(draft: DraftItem) {
    addItem.mutate(
      { orderId, ...draft.input },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <InventorySearch onSelect={(item) => add(draftFromInventoryItem(item))} onCreateCustom={() => setShowCustomForm(true)} />

      {showCustomForm ? (
        <CustomItemForm onAdd={add} />
      ) : (
        <button type="button" className="btn-secondary self-start" onClick={() => setShowCustomForm(true)}>
          Can't find it? Create a custom request
        </button>
      )}

      <button type="button" className="btn-secondary self-start px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {addItem.isError && <p className="error-text">Could not add item.</p>}
    </div>
  )
}

function AdminOrderNicknameEditor({ order }: { order: OrderDto }) {
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(order.nickname ?? '')
  const updateNickname = useAdminUpdateOrderNickname()

  function save() {
    updateNickname.mutate(
      { id: order.id, nickname: nickname.trim() || null },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (!editing) {
    return (
      <button type="button" className="btn-secondary self-start px-2 py-1 text-xs" onClick={() => setEditing(true)}>
        Rename
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Order nickname" className="w-full sm:w-64">
        <input
          className="field-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={order.id.slice(0, 8)}
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
      {updateNickname.isError && <p className="error-text">Could not save the nickname.</p>}
    </div>
  )
}

/** Order status select + item rows + add-item form - the admin's unrestricted order-editing
 *  surface, shared by the full order detail page and the inline editor on the shipment page. */
export function AdminOrderEditor({ order }: { order: OrderDto }) {
  const updateStatus = useUpdateOrderStatus()
  const markOrderPaid = useAdminMarkOrderPaid()
  const allPaid = order.items.length > 0 && order.items.every((item) => item.paid)

  return (
    <div className="flex flex-col gap-4">
      <AdminOrderNicknameEditor order={order} />

      <div className="flex flex-wrap items-end gap-4">
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

        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-sm"
          onClick={() => markOrderPaid.mutate({ orderId: order.id, paid: !allPaid })}
          disabled={markOrderPaid.isPending || order.items.length === 0}
        >
          {markOrderPaid.isPending ? <ButtonSpinner /> : allPaid ? 'Mark order unpaid' : 'Mark order paid'}
        </button>
      </div>
      {markOrderPaid.isError && <p className="error-text">Could not update paid status for this order.</p>}

      {/* profit = soldPrice[EUR] - toEur(actualPrice[JPY]), always EUR - see OrderDtos.profit() */}
      {order.profit != null && <p className="text-sm text-ink/60">Order profit: {formatMoney(order.profit, 'EUR')}</p>}

      <ul className="card divide-y divide-mist">
        {order.items.map((item) => (
          <AdminItemRow key={item.id} orderId={order.id} userId={order.userId} item={item} />
        ))}
      </ul>

      <AdminAddItemForm orderId={order.id} />
    </div>
  )
}
