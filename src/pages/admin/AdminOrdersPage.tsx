import { useState } from 'react'
import { useAdminOrders, useUpdateOrderItem, useUpdateOrderStatus } from '../../api/adminOrders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Pagination } from '../../components/Pagination'
import type { OrderStatus } from '../../types/api'

const STATUSES: OrderStatus[] = ['REQUESTED', 'IN_PROGRESS', 'PURCHASED', 'SENT', 'DELIVERED', 'CANCELLED']

function OrderItemRow({ orderId, item }: { orderId: string; item: { id: string; title: string; purchased: boolean; actualPrice: number | null; currency: string } }) {
  const [actualPrice, setActualPrice] = useState(item.actualPrice?.toString() ?? '')
  const updateItem = useUpdateOrderItem()

  return (
    <li>
      <label>
        <input
          type="checkbox"
          checked={item.purchased}
          onChange={(e) =>
            updateItem.mutate({ orderId, itemId: item.id, purchased: e.target.checked, actualPrice: actualPrice ? Number(actualPrice) : undefined })
          }
        />
        {item.title}
      </label>
      <input
        placeholder="Actual price"
        value={actualPrice}
        onChange={(e) => setActualPrice(e.target.value)}
        aria-label={`Actual price for ${item.title}`}
      />
      <button
        type="button"
        onClick={() => updateItem.mutate({ orderId, itemId: item.id, purchased: item.purchased, actualPrice: actualPrice ? Number(actualPrice) : undefined })}
      >
        Save price
      </button>
    </li>
  )
}

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(0)
  const { data, isLoading } = useAdminOrders(status, page)
  const updateStatus = useUpdateOrderStatus()

  return (
    <div>
      <h1>Admin: Orders</h1>

      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as OrderStatus | '')
          setPage(0)
        }}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {isLoading && <p>Loading...</p>}
      {data && data.content.length === 0 && <p>No orders found.</p>}

      <ul>
        {data?.content.map((order) => (
          <li key={order.id} className="border border-gray-200 p-3">
            <p>
              Order {order.id.slice(0, 8)} <OrderStatusBadge status={order.status} />
            </p>
            <select
              value={order.status}
              onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })}
              aria-label={`Update status for order ${order.id}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <ul>
              {order.items.map((item) => (
                <OrderItemRow key={item.id} orderId={order.id} item={item} />
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
