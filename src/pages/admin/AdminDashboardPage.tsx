import { useState } from 'react'
import { useUserDashboard, useUserDeliveredOrders } from '../../api/adminDashboard'
import { useAdminCreateOrderForUser, useAdminMarkItemPaid } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { errorMessage } from '../../lib/apiClient'
import { Avatar } from '../../components/Avatar'
import { Field } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderItemBuilder, type DraftItem } from '../../components/OrderItemBuilder'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { ThumbnailImage } from '../../components/ThumbnailImage'
import { formatMoney } from '../../lib/currency'
import { AdminOrderDetailPage } from './AdminOrderDetailPage'
import type { OrderDto, OrderItemDto, PendingAmountDto, UserDashboardEntryDto } from '../../types/api'

function CreateOrderForUser({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [items, setItems] = useState<DraftItem[]>([])
  const [nickname, setNickname] = useState('')
  const createOrder = useAdminCreateOrderForUser()

  async function submit() {
    try {
      await createOrder.mutateAsync({ userId, items: items.map((draft) => draft.input), nickname: nickname.trim() || undefined })
      onDone()
    } catch {
      // createOrder.isError renders the message below - stay open so the admin can retry.
    }
  }

  return (
    <div className="card flex flex-col gap-3 border-t border-mist">
      <Field label="Order nickname" hint="Optional">
        <input className="field-input" value={nickname} onChange={(e) => setNickname(e.target.value)} aria-label="Order nickname" />
      </Field>
      <OrderItemBuilder
        items={items}
        onAdd={(item) => setItems((current) => [...current, item])}
        onRemove={(index) => setItems((current) => current.filter((_, i) => i !== index))}
        onUpdateQuantity={(index, quantity) =>
          setItems((current) => current.map((item, i) => (i === index ? { ...item, input: { ...item.input, quantity } } : item)))
        }
      />
      <div className="flex items-center gap-2">
        <button type="button" className="btn-primary" disabled={items.length === 0 || createOrder.isPending} onClick={submit}>
          {createOrder.isPending ? <ButtonSpinner /> : 'Create order'}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
      {createOrder.isError && (
        <p className="error-text">
          {errorMessage(createOrder.error, 'Could not create the order. Please try again.')}
        </p>
      )}
    </div>
  )
}

function PendingSummary({ amounts }: { amounts: PendingAmountDto[] }) {
  if (amounts.length === 0) {
    return (
      <span className="rounded-full bg-mist/60 px-2.5 py-0.5 text-sm font-medium text-ink/45">All settled</span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {amounts.map((pending) => (
        <span
          key={pending.currency}
          className="rounded-full bg-mint px-2.5 py-0.5 text-sm font-semibold text-forest-deep"
        >
          {formatMoney(pending.amount, pending.currency)} owed
        </span>
      ))}
    </div>
  )
}

function PaidToggleButton({ orderId, item }: { orderId: string; item: OrderItemDto }) {
  const setPaid = useAdminMarkItemPaid()
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={item.paid ? 'btn-secondary px-2 py-1 text-xs' : 'btn-primary px-2 py-1 text-xs'}
        onClick={() => setPaid.mutate({ orderId, itemId: item.id, paid: !item.paid })}
        disabled={setPaid.isPending}
      >
        {setPaid.isPending ? <ButtonSpinner /> : item.paid ? 'Mark unpaid' : 'Mark paid'}
      </button>
      {setPaid.isError && <p className="error-text text-xs">Could not update paid status.</p>}
    </div>
  )
}

function OrderItemRow({ orderId, item }: { orderId: string; item: OrderItemDto }) {
  // What's owed is soldPrice (what the customer is charged), not actualPrice (the admin's own
  // JPY cost basis) - both soldPrice and maxPrice are always EUR.
  const price = item.soldPrice ?? item.maxPrice

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper/60 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <ThumbnailImage imageKey={item.imageKey} className="h-10 w-10 shrink-0 rounded-lg" />
        <span className="truncate text-sm text-ink/80">{item.title}</span>
        <OrderItemStatusBadge status={item.status} />
        {price != null && <span className="text-sm text-ink/60">{formatMoney(price, 'EUR')}</span>}
      </div>
      <PaidToggleButton orderId={orderId} item={item} />
    </li>
  )
}

function DashboardOrderRow({ order }: { order: OrderDto }) {
  const [showDetail, setShowDetail] = useState(false)
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setShowDetail(true)} className="font-medium text-ink hover:text-forest">
          Order {orderDisplayName(order)}
        </button>
        <OrderIdHint id={order.id} nickname={order.nickname} />
        <OrderStatusBadge status={order.status} />
      </div>
      <ul className="flex flex-col gap-1.5">
        {order.items.map((item) => (
          <OrderItemRow key={item.id} orderId={order.id} item={item} />
        ))}
      </ul>
      {showDetail && (
        <Modal onClose={() => setShowDetail(false)}>
          <AdminOrderDetailPage id={order.id} onClose={() => setShowDetail(false)} />
        </Modal>
      )}
    </div>
  )
}

function DeliveredOrdersAccordion({ userId, count }: { userId: string; count: number }) {
  const [open, setOpen] = useState(false)
  const { data: deliveredOrders, isLoading } = useUserDeliveredOrders(userId, open)

  if (count === 0) return null

  return (
    <div className="border-t border-mist pt-1">
      <button
        type="button"
        className="flex items-center gap-2 py-1 text-sm text-ink/60 hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
        {count} delivered order(s)
      </button>
      {open && (
        <div className="flex flex-col divide-y divide-mist">
          {isLoading && <Spinner label="Fetching delivered orders" />}
          {deliveredOrders?.map((order) => (
            <DashboardOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function UserDashboardCard({ entry }: { entry: UserDashboardEntryDto }) {
  const [expanded, setExpanded] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const owesMoney = entry.pendingAmounts.length > 0

  return (
    <li className={`card flex flex-col gap-3 ${owesMoney ? 'ring-1 ring-inset ring-sage' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="flex flex-1 flex-wrap items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <Avatar imageKey={entry.user.avatarKey} nickname={entry.user.nickname} />
          <span className="font-medium text-ink">{entry.user.nickname}</span>
          <span className="text-xs text-ink/50">{entry.orders.length} order(s)</span>
        </button>
        <div className="flex items-center gap-3">
          <PendingSummary amounts={entry.pendingAmounts} />
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setCreatingOrder((v) => !v)}>
            {creatingOrder ? 'Cancel' : 'Create order'}
          </button>
          <span className="text-ink/40" aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {creatingOrder && <CreateOrderForUser userId={entry.user.id} onDone={() => setCreatingOrder(false)} />}

      {expanded && (
        <div className="flex flex-col divide-y divide-mist border-t border-mist pt-1">
          {entry.orders.map((order) => (
            <DashboardOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}

      {expanded && <DeliveredOrdersAccordion userId={entry.user.id} count={entry.deliveredOrderCount} />}
    </li>
  )
}

export function AdminDashboardPage() {
  const { data, isLoading, isError } = useUserDashboard()

  if (isLoading) return <Spinner fullPage label="Fetching users" />
  if (isError) return <p className="error-text">Could not load the dashboard. Try refreshing the page.</p>

  const entries = [...(data ?? [])].sort((a, b) => {
    const aOwes = a.pendingAmounts.length > 0
    const bOwes = b.pendingAmounts.length > 0
    if (aOwes !== bOwes) return aOwes ? -1 : 1
    return a.user.nickname.localeCompare(b.user.nickname)
  })

  return (
    <div>
      <h1 className="page-title mb-4">Admin: Dashboard</h1>

      {entries.length === 0 && <p className="text-ink/50">No users have placed orders yet.</p>}

      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <UserDashboardCard key={entry.user.id} entry={entry} />
        ))}
      </ul>
    </div>
  )
}
