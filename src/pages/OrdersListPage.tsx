import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyOrders } from '../api/orders'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { Spinner } from '../components/Spinner'

export function OrdersListPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useMyOrders(page)

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">My orders</h1>
        <Link to="/orders/new" className="btn-primary self-start sm:self-auto">
          New request
        </Link>
      </div>

      {isLoading && <Spinner label="Fetching orders" />}
      {isError && <p className="error-text">Could not load orders.</p>}
      {data && data.content.length === 0 && <p className="text-ink/50">No orders yet.</p>}

      <ul className="flex flex-col gap-2">
        {data?.content.map((order) => (
          <li key={order.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link to={`/orders/${order.id}`} className="font-medium text-ink hover:text-persimmon">
              Order {order.id.slice(0, 8)} — {order.items.length} item(s)
            </Link>
            <OrderStatusBadge status={order.status} />
          </li>
        ))}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
