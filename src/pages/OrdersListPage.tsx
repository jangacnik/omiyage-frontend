import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyOrders } from '../api/orders'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'

export function OrdersListPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useMyOrders(page)

  return (
    <div>
      <h1>My orders</h1>
      <Link to="/orders/new">New request</Link>

      {isLoading && <p>Loading...</p>}
      {isError && <p>Could not load orders.</p>}
      {data && data.content.length === 0 && <p>No orders yet.</p>}

      <ul>
        {data?.content.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.id}`}>
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
