import { useState } from 'react'
import { useAdminOrders, useUpdateOrderItem, useUpdateOrderStatus } from '../../api/adminOrders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Pagination } from '../../components/Pagination'
import { Spinner } from '../../components/Spinner'
import type { OrderStatus } from '../../types/api'

const STATUSES: OrderStatus[] = ['REQUESTED', 'IN_PROGRESS', 'PURCHASED', 'SENT', 'DELIVERED', 'CANCELLED']

function OrderItemRow({ orderId, item }: { orderId: string; item: { id: string; title: string; purchased: boolean; actualPrice: number | null; currency: string } }) {
  const [actualPrice, setActualPrice] = useState(item.actualPrice?.toString() ?? '')
  const updateItem = useUpdateOrderItem()

  return (
    <li className="flex flex-wrap items-center gap-2 py-1.5">
      <label className="flex items-center gap-1.5 text-sm text-slate-700">
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
        className="field-input w-32 py-1"
      />
      <button
        type="button"
        className="btn-secondary px-2 py-1 text-xs"
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
      {data && data.content.length === 0 && <p className="text-slate-500">No orders found.</p>}

      <ul className="flex flex-col gap-3">
        {data?.content.map((order) => (
          <li key={order.id} className="card">
            <p className="mb-2 flex items-center gap-2 font-medium text-slate-900">
              Order {order.id.slice(0, 8)} <OrderStatusBadge status={order.status} />
            </p>
            <select
              value={order.status}
              onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })}
              aria-label={`Update status for order ${order.id}`}
              className="field-input mb-2 max-w-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <ul className="divide-y divide-slate-100 border-t border-slate-100">
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
