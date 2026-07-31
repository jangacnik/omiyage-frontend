import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminOrders } from '../../api/adminOrders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Pagination } from '../../components/Pagination'
import { Spinner } from '../../components/Spinner'
import type { OrderStatus } from '../../types/api'

const STATUSES: OrderStatus[] = ['REQUESTED', 'IN_PROGRESS', 'PURCHASED', 'SENT', 'DELIVERED', 'CANCELLED']

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(0)
  const { data, isLoading } = useAdminOrders(status, page)

  return (
    <div>
      <h1 className="page-title mb-4">Admin: Orders</h1>

      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as OrderStatus | '')
          setPage(0)
        }}
        aria-label="Filter by status"
        className="field-input mb-4 max-w-xs"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {isLoading && <Spinner label="Fetching orders" />}
      {data && data.content.length === 0 && <p className="text-ink/50">No orders found.</p>}

      <ul className="flex flex-col gap-2">
        {data?.content.map((order) => (
          <li key={order.id}>
            <Link
              to={`/admin/orders/${order.id}`}
              className="card flex flex-col gap-2 transition-colors hover:bg-stone-light sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                Order {order.id.slice(0, 8)} <OrderStatusBadge status={order.status} />
              </span>
              <span className="text-sm text-ink/60">{order.items.length} item(s)</span>
            </Link>
          </li>
        ))}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
