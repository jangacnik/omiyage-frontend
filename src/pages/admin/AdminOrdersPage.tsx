import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminOrders, useCreateShipment } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Pagination } from '../../components/Pagination'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import type { OrderStatus } from '../../types/api'

const STATUSES: OrderStatus[] = ['REQUESTED', 'IN_PROGRESS', 'PURCHASED', 'SENT', 'DELIVERED', 'CANCELLED']

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const { data, isLoading } = useAdminOrders(status, page)
  const createShipment = useCreateShipment()
  const navigate = useNavigate()

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]))
  }

  async function combine() {
    const shipment = await createShipment.mutateAsync(selected)
    setSelected([])
    navigate(`/admin/shipments/${shipment.id}`)
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
          <li key={order.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(order.id)}
                onChange={() => toggle(order.id)}
                aria-label={`Select order ${order.id.slice(0, 8)}`}
              />
              <Link to={`/admin/orders/${order.id}`} className="flex items-center gap-2 font-medium text-ink hover:text-persimmon">
                Order {orderDisplayName(order)} <OrderStatusBadge status={order.status} />
                {order.shipmentId && (
                  <span className="rounded-full bg-stone-light px-2 py-0.5 text-xs text-ink/70">
                    shipment {order.shipmentId.slice(0, 8)}
                  </span>
                )}
              </Link>
            </label>
            <span className="text-sm text-ink/60">{order.items.length} item(s)</span>
          </li>
        ))}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
