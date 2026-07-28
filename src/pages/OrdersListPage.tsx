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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-title">My orders</h1>
        <Link to="/orders/new" className="btn-primary">
          New request
        </Link>
      </div>

      {isLoading && <Spinner label="Fetching orders" />}
      {isError && <p className="error-text">Could not load orders.</p>}
      {data && data.content.length === 0 && <p className="text-slate-500">No orders yet.</p>}

      <ul className="flex flex-col gap-2">
        {data?.content.map((order) => (
          <li key={order.id} className="card flex items-center justify-between">
            <Link to={`/orders/${order.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
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
