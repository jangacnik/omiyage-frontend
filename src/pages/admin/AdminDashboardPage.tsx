import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserDashboard } from '../../api/adminDashboard'
import { useAdminCreateOrderForUser, useAdminMarkItemPaid } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { Avatar } from '../../components/Avatar'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderItemBuilder, type DraftItem } from '../../components/OrderItemBuilder'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { ThumbnailImage } from '../../components/ThumbnailImage'
import { formatMoney } from '../../lib/currency'
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
      <input
        placeholder="Nickname for this order (optional)"
        className="field-input"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        aria-label="Order nickname"
      />
      <OrderItemBuilder
        items={items}
        onAdd={(item) => setItems((current) => [...current, item])}
        onRemove={(index) => setItems((current) => current.filter((_, i) => i !== index))}
      />
      <div className="flex items-center gap-2">
        <button type="button" className="btn-primary" disabled={items.length === 0 || createOrder.isPending} onClick={submit}>
          {createOrder.isPending ? <ButtonSpinner /> : 'Create order'}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
      {createOrder.isError && <p className="error-text">Could not create the order.</p>}
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
  // actualPrice is always JPY and maxPrice is always EUR - pick the matching currency, don't
  // assume item.currency (which only ever describes maxPrice).
  const price = item.actualPrice ?? item.maxPrice
  const priceCurrency = item.actualPrice != null ? (item.actualPriceCurrency ?? item.currency) : item.currency

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper/60 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <ThumbnailImage imageKey={item.imageKey} className="h-10 w-10 shrink-0 rounded-lg" />
        <span className="truncate text-sm text-ink/80">{item.title}</span>
        <OrderItemStatusBadge status={item.status} />
        {price != null && <span className="text-sm text-ink/60">{formatMoney(price, priceCurrency)}</span>}
      </div>
      <PaidToggleButton orderId={orderId} item={item} />
    </li>
  )
}

function DashboardOrderRow({ order }: { order: OrderDto }) {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink hover:text-forest">
          Order {orderDisplayName(order)}
        </Link>
        <OrderIdHint id={order.id} nickname={order.nickname} />
        <OrderStatusBadge status={order.status} />
      </div>
      <ul className="flex flex-col gap-1.5">
        {order.items.map((item) => (
          <OrderItemRow key={item.id} orderId={order.id} item={item} />
        ))}
      </ul>
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
