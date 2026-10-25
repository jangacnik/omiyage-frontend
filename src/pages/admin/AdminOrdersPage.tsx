import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminDeleteOrder, useAdminMergeOrders, useAdminOrders, useCreateShipment } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { useConfirm } from '../../components/confirmContext'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Pagination } from '../../components/Pagination'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { StatusPill } from '../../components/StatusPill'
import { IconButton } from '../../components/IconButton'
import { TrashIcon } from '../../components/icons'
import { formatMoney } from '../../lib/currency'
import type { AdminOrderSortBy, OrderStatus, SortDirection } from '../../types/api'

const STATUSES: OrderStatus[] = ['REQUESTED', 'IN_PROGRESS', 'PURCHASED', 'PREPARING_SHIPPING', 'SENT', 'DELIVERED', 'CANCELLED']

const SORT_OPTIONS: { value: `${AdminOrderSortBy}:${SortDirection}`; label: string }[] = [
  { value: 'UPDATED_AT:DESC', label: 'Last updated (newest first)' },
  { value: 'UPDATED_AT:ASC', label: 'Last updated (oldest first)' },
  { value: 'CREATED_AT:DESC', label: 'Order date (newest first)' },
  { value: 'CREATED_AT:ASC', label: 'Order date (oldest first)' },
  { value: 'ITEM_COUNT:DESC', label: 'Item count (most first)' },
  { value: 'ITEM_COUNT:ASC', label: 'Item count (fewest first)' },
]

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<`${AdminOrderSortBy}:${SortDirection}`>('UPDATED_AT:DESC')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, direction] = sort.split(':') as [AdminOrderSortBy, SortDirection]
  const { data, isLoading } = useAdminOrders(status, page, sortBy, direction)
  const createShipment = useCreateShipment()
  const mergeOrders = useAdminMergeOrders()
  const deleteOrder = useAdminDeleteOrder()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const selectedOrders = data?.content.filter((o) => selected.includes(o.id)) ?? []
  // Only meaningful once every selected order is resolvable on the current page - a selection
  // spanning pages can't be checked here, same limitation "combine into shipment" above already has.
  const canMerge = selected.length >= 2 && selectedOrders.length === selected.length && new Set(selectedOrders.map((o) => o.userId)).size === 1

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]))
  }

  async function combine() {
    const shipment = await createShipment.mutateAsync(selected)
    setSelected([])
    navigate(`/admin/shipments/${shipment.id}`)
  }

  async function merge() {
    const ok = await confirm({
      title: 'Merge orders',
      message: `Merge these ${selected.length} orders into one? Every item moves onto a single order and the rest are deleted, including their nicknames and notes. This can't be undone.`,
      confirmLabel: 'Merge',
      danger: true,
    })
    if (!ok) return
    const merged = await mergeOrders.mutateAsync(selected)
    setSelected([])
    navigate(`/admin/orders/${merged.id}`)
  }

  async function handleDelete(orderId: string) {
    const ok = await confirm({
      title: 'Delete order',
      message: 'Delete this order? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteOrder.mutate(orderId)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Admin: Orders</h1>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={combine} disabled={createShipment.isPending}>
              {createShipment.isPending ? <ButtonSpinner /> : `Combine ${selected.length} into shipment`}
            </button>
            {selected.length >= 2 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={merge}
                disabled={mergeOrders.isPending || !canMerge}
                title={canMerge ? undefined : 'Selected orders must all belong to the same user to merge into one order.'}
              >
                {mergeOrders.isPending ? <ButtonSpinner /> : `Merge ${selected.length} into one order`}
              </button>
            )}
          </div>
        )}
      </div>
      {mergeOrders.isError && <p className="error-text mb-2">Could not merge these orders.</p>}

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | '')
            setPage(0)
          }}
          aria-label="Filter by status"
          className="field-input max-w-xs"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as `${AdminOrderSortBy}:${SortDirection}`)
            setPage(0)
          }}
          aria-label="Sort orders by"
          className="field-input max-w-xs"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner fullPage label="Fetching orders" />}
      {data && data.content.length === 0 && (
        <div className="card flex flex-col items-center gap-1 py-8 text-center">
          <p className="text-muted">No orders found.</p>
          {status && (
            <button
              type="button"
              className="btn-secondary mt-1"
              onClick={() => {
                setStatus('')
                setPage(0)
              }}
            >
              Clear status filter
            </button>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {data?.content.map((order) => {
          const paidCount = order.items.filter((item) => item.paid).length
          return (
            <li key={order.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(order.id)}
                  onChange={() => toggle(order.id)}
                  aria-label={`Select order ${order.id.slice(0, 8)}`}
                />
                <Link
                  to={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center gap-2 font-medium text-ink hover:text-forest"
                >
                  Order {orderDisplayName(order)}
                  <OrderIdHint id={order.id} nickname={order.nickname} />
                  {order.userNickname && (
                    <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-ink/70">by {order.userNickname}</span>
                  )}
                  <OrderStatusBadge status={order.status} />
                  {order.shipmentId && (
                    <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-ink/70">
                      shipment {order.shipmentId.slice(0, 8)}
                    </span>
                  )}
                  {order.items.length > 0 && (
                    <StatusPill
                      tone={paidCount === order.items.length ? 'done' : paidCount > 0 ? 'mid' : 'idle'}
                      label={paidCount === order.items.length ? 'Paid' : `${paidCount}/${order.items.length} paid`}
                      size="sm"
                    />
                  )}
                  {order.profit != null && (
                    <span className="text-xs font-medium text-muted">{formatMoney(order.profit, 'EUR')} profit</span>
                  )}
                </Link>
              </label>
              <span className="flex items-center gap-3">
                <span className="text-sm text-muted">{order.items.length} item(s)</span>
                <IconButton
                  variant="danger"
                  label="Delete"
                  onClick={() => handleDelete(order.id)}
                  disabled={deleteOrder.isPending}
                  icon={<TrashIcon size={14} />}
                />
              </span>
            </li>
          )
        })}
      </ul>
      {deleteOrder.isError && <p className="error-text">Could not delete that order.</p>}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
