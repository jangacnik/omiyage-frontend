import { useState } from 'react'
import {
  useAdminAddOrderItem,
  useAdminMarkItemPaid,
  useAdminMarkOrderPaid,
  useAdminMoveOrderItems,
  useAdminOrdersForUser,
  useAdminRemoveOrderItem,
  useAdminUpdateOrderItemContent,
  useAdminUpdateOrderNickname,
  useUpdateOrderItem,
  useUpdateOrderStatus,
} from '../../api/adminOrders'
import { AnchoredDialog } from '../../components/AnchoredDialog'
import { useTriggerAnchor } from '../../components/useTriggerAnchor'
import { useConfirm } from '../../components/confirmContext'
import { Field } from '../../components/Field'
import { OrderItemCard } from '../../components/OrderItemCard'
import { AddItemPanel } from '../../components/OrderItemBuilder'
import { preservedItemFields } from '../../lib/orderItemDrafts'
import { ORDER_ITEM_STATUS_OPTIONS } from '../../lib/orderItemLabels'
import { StatusSelect } from '../../components/StatusSelect'
import { ButtonSpinner } from '../../components/Spinner'
import { IconButton } from '../../components/IconButton'
import { CheckIcon, CloseIcon, EditIcon, MoveIcon, TrashIcon } from '../../components/icons'
import { ApiError, errorMessage } from '../../lib/apiClient'
import { formatMoney } from '../../lib/currency'
import { AdminOrderItemEditDialog } from './AdminOrderItemEditDialog'
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
  // No default selection - the first real option used to be "New order", so leaving the select
  // untouched and clicking Move silently split the item into a brand-new order. Empty string is
  // the unchosen state; NEW_ORDER is a distinct sentinel so "explicitly chose New order" can be
  // told apart from "never touched the select".
  const [targetOrderId, setTargetOrderId] = useState('')
  const moveItems = useAdminMoveOrderItems()
  const otherOrders = (userOrders ?? []).filter((o) => o.id !== orderId)
  const anchor = useTriggerAnchor()
  const NEW_ORDER = '__new_order__'

  function move() {
    moveItems.mutate(
      { orderId, itemIds: [item.id], targetOrderId: targetOrderId === NEW_ORDER ? undefined : targetOrderId },
      { onSuccess: onClose },
    )
  }

  return (
    <AnchoredDialog anchor={anchor} onClose={onClose} labelledBy="move-item-title" className="flex flex-col gap-3">
      <h2 id="move-item-title" className="page-title text-lg">
        Move &quot;{item.title}&quot;
      </h2>
      <Field label="Move to">
        <select
          value={targetOrderId}
          onChange={(e) => setTargetOrderId(e.target.value)}
          aria-label="Move to order"
          className="field-input"
        >
          <option value="" disabled>
            Choose a destination…
          </option>
          <option value={NEW_ORDER}>New order</option>
          {otherOrders.map((o) => (
            <option key={o.id} value={o.id}>
              Order {o.id.slice(0, 8)} ({o.status})
            </option>
          ))}
        </select>
      </Field>
      {moveItems.isError && <p className="error-text">Could not move this item.</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={move} disabled={moveItems.isPending || !targetOrderId}>
          {moveItems.isPending ? <ButtonSpinner /> : 'Move'}
        </button>
      </div>
    </AnchoredDialog>
  )
}

/** Bumps just the status, in place, without opening the full edit dialog - the other price/weight
 *  fields on this same PATCH endpoint are sent back unchanged (see OrderService.updateItem on the
 *  backend: it fully replaces those fields from whatever a caller sends, so omitting them would
 *  silently wipe them). */
function QuickStatusSelect({ orderId, item }: { orderId: string; item: OrderItemDto }) {
  const updateItem = useUpdateOrderItem()

  return (
    <div className="flex flex-col items-end gap-1">
      <StatusSelect
        value={item.status}
        options={ORDER_ITEM_STATUS_OPTIONS}
        onChange={(status) => status && updateItem.mutate({ orderId, itemId: item.id, ...preservedItemFields(item), status })}
        ariaLabel={`Quick status for ${item.title}`}
        className="w-40"
        disabled={updateItem.isPending}
      />
      {/* The select snaps back to item.status (server cache) on failure, which reads as "did
          nothing" with no other signal - every other mutation on this row shows its own error. */}
      {updateItem.isError && <p className="error-text text-xs">{errorMessage(updateItem.error, 'Could not update status.')}</p>}
    </div>
  )
}

function AdminItemRow({
  orderId,
  userId,
  item,
  selected,
  onToggleSelect,
}: {
  orderId: string
  userId: string
  item: OrderItemDto
  selected: boolean
  onToggleSelect: () => void
}) {
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
    <li className={`flex gap-2 rounded-lg px-2 py-4 ${selected ? 'bg-mint/20' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label={`Select ${item.title} for bulk edit`}
        className="mt-1 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <OrderItemCard item={item}>
          <div className="flex flex-col items-end gap-2">
            <QuickStatusSelect orderId={orderId} item={item} />
            <div className="flex flex-wrap justify-end gap-2">
              <IconButton
                label={item.paid ? 'Mark unpaid' : 'Mark paid'}
                onClick={() => markPaid.mutate({ orderId, itemId: item.id, paid: !item.paid })}
                disabled={markPaid.isPending}
                icon={markPaid.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
                className={item.paid ? 'bg-mint text-forest-deep ring-forest/40' : ''}
              />
              <IconButton label="Edit" onClick={() => setEditing(true)} icon={<EditIcon size={14} />} />
              <IconButton label="Move to another order" onClick={() => setMoving(true)} icon={<MoveIcon size={14} />} />
              <IconButton
                variant="danger"
                label="Remove"
                onClick={remove}
                disabled={removeItem.isPending}
                icon={removeItem.isPending ? <ButtonSpinner /> : <TrashIcon size={14} />}
              />
            </div>
            {(removeItem.isError || markPaid.isError) && (
              <p className="error-text">
                {removeItem.isError && 'Could not remove this item. '}
                {markPaid.isError && 'Could not update paid status.'}
              </p>
            )}
          </div>
        </OrderItemCard>
      </div>
      {editing && <AdminOrderItemEditDialog orderId={orderId} item={item} onClose={() => setEditing(false)} />}
      {moving && <AdminMoveItemDialog orderId={orderId} userId={userId} item={item} onClose={() => setMoving(false)} />}
    </li>
  )
}


/** Mass-apply a status and/or bought/sold price to every checked item in this order at once.
 *  A blank status/price field means "leave each item's own value alone" - each PATCH still sends
 *  every field, since the backend fully replaces them (see QuickStatusSelect's comment above). */
function BulkEditBar({
  orderId,
  items,
  selectedIds,
  onClear,
  onSucceeded,
}: {
  orderId: string
  items: OrderItemDto[]
  selectedIds: string[]
  onClear: () => void
  onSucceeded: (succeededIds: string[]) => void
}) {
  const [status, setStatus] = useState<OrderItemStatus | ''>('')
  const [actualPrice, setActualPrice] = useState('')
  const [soldPrice, setSoldPrice] = useState('')
  const [applying, setApplying] = useState(false)
  const [failedCount, setFailedCount] = useState(0)
  const [lastError, setLastError] = useState<unknown>(null)
  // Frozen at the moment a batch is applied, so the "N of M failed" message stays internally
  // consistent even if the admin changes the checkbox selection afterward instead of retrying -
  // otherwise M would silently become "however many are checked right now", not the batch M
  // actually refers to.
  const [attemptedCount, setAttemptedCount] = useState(0)
  const updateItem = useUpdateOrderItem()
  const confirm = useConfirm()

  const selectedItems = items.filter((item) => selectedIds.includes(item.id))
  const count = selectedItems.length
  const changesPrice = actualPrice !== '' || soldPrice !== ''

  async function apply() {
    // Disable the button for the whole confirm-then-apply round trip, not just the apply half -
    // otherwise a second click before the confirm dialog is answered fires a second confirm(),
    // which replaces ConfirmProvider's single pending resolver and silently strands the first one.
    setApplying(true)
    const ok = await confirm({
      title: 'Bulk update items',
      message: `Apply this to all ${count} selected item${count === 1 ? '' : 's'}?${
        changesPrice ? ' This overwrites bought/sold price on every one of them.' : ''
      }`,
      confirmLabel: `Apply to ${count}`,
      danger: changesPrice,
    })
    if (!ok) {
      setApplying(false)
      return
    }

    setFailedCount(0)
    setLastError(null)
    setAttemptedCount(selectedItems.length)
    const outcomes = await Promise.allSettled(
      selectedItems.map((item) =>
        updateItem
          .mutateAsync({
            orderId,
            itemId: item.id,
            ...preservedItemFields(item),
            status: status || item.status,
            ...(actualPrice !== '' && { actualPrice: Number(actualPrice) }),
            ...(soldPrice !== '' && { soldPrice: Number(soldPrice) }),
          })
          .then(() => item.id),
      ),
    )
    // Only drop the items that actually saved from the selection - a failed one stays checked so
    // "the rest stay selected, retry when ready" (below) is literally true, and Apply doesn't
    // resend an unnecessary PATCH to items that already succeeded.
    const succeededIds = outcomes.flatMap((outcome) => (outcome.status === 'fulfilled' ? [outcome.value] : []))
    const rejected = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
    const failed = outcomes.length - succeededIds.length
    setApplying(false)
    setFailedCount(failed)
    setLastError(rejected?.reason ?? null)
    if (failed === 0) {
      setStatus('')
      setActualPrice('')
      setSoldPrice('')
    }
    onSucceeded(succeededIds)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-forest/30 bg-mint/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">
          {count} item{count === 1 ? '' : 's'} selected
        </p>
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={onClear}>
          Clear selection
        </button>
      </div>
      <Field label="Set status" hint="Leave unset to only change price" className="sm:max-w-xs">
        <StatusSelect
          value={status}
          options={ORDER_ITEM_STATUS_OPTIONS}
          onChange={setStatus}
          emptyLabel="Don't change"
          ariaLabel="Bulk status"
        />
      </Field>
      {/* Same tinted-box treatment as the single-item edit dialog: this pair is the one most
          likely to get mixed up under time pressure, now with N items' blast radius at once. */}
      <div className="flex flex-col gap-3 rounded-lg bg-mist/60 p-3">
        <p className="text-xs font-medium text-muted">Money - what we paid vs. what the customer pays</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bought for" hint="In JPY - blank keeps each item's own">
            <input
              type="number"
              step="1"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              className="field-input"
              aria-label="Bulk bought price, in JPY"
            />
          </Field>
          <Field label="Sold for" hint="In EUR - blank keeps each item's own">
            <input
              type="number"
              step="0.01"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              className="field-input"
              aria-label="Bulk sold price, in EUR"
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary px-3 py-1.5 text-sm"
          onClick={apply}
          disabled={applying || (!status && !changesPrice)}
        >
          {applying ? <ButtonSpinner /> : `Apply to ${count} item${count === 1 ? '' : 's'}`}
        </button>
        {failedCount > 0 && (
          <p className="error-text">
            {failedCount} of {attemptedCount} item{attemptedCount === 1 ? '' : 's'} failed to update
            {lastError instanceof ApiError ? `: ${lastError.message}` : '.'} The failed ones stay selected - retry when ready.
          </p>
        )}
      </div>
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
    return <IconButton label="Rename" onClick={() => setEditing(true)} icon={<EditIcon size={14} />} className="self-start" />
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Order name" className="w-full sm:w-64">
        <input
          className="field-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={order.id.slice(0, 8)}
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
      {updateNickname.isError && <p className="error-text">Could not save the nickname.</p>}
    </div>
  )
}

/** Order status select + item rows + add-item form - the admin's unrestricted order-editing
 *  surface, shared by the full order detail page and the inline editor on the shipment page. */
const CONFIRM_STATUSES: OrderStatus[] = ['CANCELLED', 'DELIVERED']

export function AdminOrderEditor({ order }: { order: OrderDto }) {
  const updateStatus = useUpdateOrderStatus()
  const markOrderPaid = useAdminMarkOrderPaid()
  const confirm = useConfirm()
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const allPaid = order.items.length > 0 && order.items.every((item) => item.paid)

  function toggleItemSelected(id: string) {
    setSelectedItemIds((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]))
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as OrderStatus
    if (CONFIRM_STATUSES.includes(status)) {
      // A controlled <select> still lets the browser show the just-clicked option the instant it's
      // picked, before this async handler resolves - if the confirm is cancelled, nothing else
      // re-renders (order.status never changed), so the DOM element must be reset back by hand or
      // it keeps visually showing the cancelled status.
      const target = e.target
      const ok = await confirm({
        title: `Mark order as ${status}`,
        message: `Set this order's status to ${status}? This is a terminal state and can't be walked back through this dropdown.`,
        confirmLabel: 'Set status',
      })
      if (!ok) {
        target.value = order.status
        return
      }
    }
    updateStatus.mutate({ id: order.id, status })
  }

  async function handleMarkOrderPaid() {
    const count = order.items.length
    const ok = await confirm({
      title: allPaid ? 'Mark order unpaid' : 'Mark order paid',
      message: allPaid
        ? `Mark all ${count} item${count === 1 ? '' : 's'} on this order unpaid?`
        : `Mark all ${count} item${count === 1 ? '' : 's'} on this order paid? This overwrites any items that were only individually marked paid or unpaid.`,
      confirmLabel: allPaid ? 'Mark unpaid' : 'Mark paid',
    })
    if (ok) markOrderPaid.mutate({ orderId: order.id, paid: !allPaid })
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminOrderNicknameEditor order={order} />

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Order status">
          <span className="flex items-center gap-2">
            <select
              value={order.status}
              onChange={handleStatusChange}
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
        </Field>

        <IconButton
          label={allPaid ? 'Mark order unpaid' : 'Mark order paid'}
          onClick={handleMarkOrderPaid}
          disabled={markOrderPaid.isPending || order.items.length === 0}
          icon={markOrderPaid.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
          className={allPaid ? 'bg-mint text-forest-deep ring-forest/40' : ''}
        />
      </div>
      {markOrderPaid.isError && <p className="error-text">Could not update paid status for this order.</p>}

      {/* profit = soldPrice[EUR] - toEur(actualPrice[JPY]), always EUR - see OrderDtos.profit() */}
      {order.profit != null && <p className="text-sm text-muted">Order profit: {formatMoney(order.profit, 'EUR')}</p>}

      {selectedItemIds.length > 0 && (
        <BulkEditBar
          orderId={order.id}
          items={order.items}
          selectedIds={selectedItemIds}
          onClear={() => setSelectedItemIds([])}
          onSucceeded={(succeededIds) => setSelectedItemIds((current) => current.filter((id) => !succeededIds.includes(id)))}
        />
      )}

      <ul className="card divide-y divide-mist">
        {order.items.map((item) => (
          <AdminItemRow
            key={item.id}
            orderId={order.id}
            userId={order.userId}
            item={item}
            selected={selectedItemIds.includes(item.id)}
            onToggleSelect={() => toggleItemSelected(item.id)}
          />
        ))}
      </ul>

      <AddItemPanel orderId={order.id} items={order.items} useAddMutation={useAdminAddOrderItem} useUpdateMutation={useAdminUpdateOrderItemContent} />
    </div>
  )
}
