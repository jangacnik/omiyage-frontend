import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminDeleteOrder, useAdminOrders, useCreateShipment } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { useConfirm } from '../../components/ConfirmDialog'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Pagination } from '../../components/Pagination'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { TrashIcon } from '../../components/icons'
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
  const deleteOrder = useAdminDeleteOrder()
  const confirm = useConfirm()
  const navigate = useNavigate()

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]))
  }

  async function combine() {
    const shipment = await createShipment.mutateAsync(selected)
    setSelected([])
    navigate(`/admin/shipments/${shipment.id}`)
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
          <button type="button" className="btn-primary" onClick={combine} disabled={createShipment.isPending}>
            {createShipment.isPending ? <ButtonSpinner /> : `Combine ${selected.length} into shipment`}
          </button>
        )}
      </div>

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

      {isLoading && <Spinner label="Fetching orders" />}
      {data && data.content.length === 0 && <p className="text-ink/50">No orders found.</p>}

      <ul className="flex flex-col gap-2">
        {data?.content.map((order) => (
          <li key={order.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(order.id)}
                onChange={() => toggle(order.id)}
                aria-label={`Select order ${order.id.slice(0, 8)}`}
              />
              <Link to={`/admin/orders/${order.id}`} className="flex flex-wrap items-center gap-2 font-medium text-ink hover:text-forest">
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
              </Link>
            </label>
            <span className="flex items-center gap-3">
              <span className="text-sm text-ink/60">{order.items.length} item(s)</span>
              <button
                type="button"
                className="btn-danger px-2 py-1 text-xs"
                onClick={() => handleDelete(order.id)}
                disabled={deleteOrder.isPending}
              >
                <TrashIcon size={13} /> Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      {deleteOrder.isError && <p className="error-text">Could not delete that order.</p>}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
