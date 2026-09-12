import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserDashboard } from '../../api/adminDashboard'
import { useAdminMarkItemPaid } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { mediaUrl } from '../../lib/media'
import type { Currency, OrderDto, OrderItemDto, PendingAmountDto, UserDashboardEntryDto } from '../../types/api'

function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
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
  const price = item.actualPrice ?? item.maxPrice

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper/60 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-mist">
          {item.imageKey && <img src={mediaUrl(item.imageKey)} alt="" className="h-full w-full object-cover" />}
        </div>
        <span className="truncate text-sm text-ink/80">{item.title}</span>
        <OrderItemStatusBadge status={item.status} />
        {price != null && <span className="text-sm text-ink/60">{formatMoney(price, item.currency)}</span>}
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
  const owesMoney = entry.pendingAmounts.length > 0

  return (
    <li className={`card flex flex-col gap-3 ${owesMoney ? 'ring-1 ring-inset ring-sage' : ''}`}>
      <button
        type="button"
        className="flex flex-wrap items-center justify-between gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-ink">{entry.user.nickname}</span>
          <span className="text-xs text-ink/50">{entry.orders.length} order(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <PendingSummary amounts={entry.pendingAmounts} />
          <span className="text-ink/40" aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

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
  const { data, isLoading } = useUserDashboard()

  if (isLoading) return <Spinner fullPage label="Fetching users" />

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
