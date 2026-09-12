import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyOrders } from '../api/orders'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { Spinner } from '../components/Spinner'
import type { OrderDto } from '../types/api'

function ShipmentGroup({ orders }: { orders: OrderDto[] }) {
  const [activeId, setActiveId] = useState(orders[0].id)
  const active = orders.find((o) => o.id === activeId) ?? orders[0]

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink/60">Shipment {active.shipmentId?.slice(0, 8)}</span>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-stone-light pb-2">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => setActiveId(order.id)}
            className={`nav-link ${order.id === activeId ? 'bg-stone-light text-ink' : ''}`}
          >
            Order {order.id.slice(0, 8)}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Link to={`/orders/${active.id}`} className="font-medium text-ink hover:text-persimmon">
          {active.items.length} item(s)
        </Link>
        <OrderStatusBadge status={active.status} />
      </div>
    </li>
  )
}

export function OrdersListPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useMyOrders(page)

  const groups: OrderDto[][] = []
  if (data) {
    const byShipment = new Map<string, OrderDto[]>()
    for (const order of data.content) {
      if (order.shipmentId) {
        const list = byShipment.get(order.shipmentId) ?? []
        list.push(order)
        byShipment.set(order.shipmentId, list)
      } else {
        groups.push([order])
      }
    }
    groups.push(...byShipment.values())
  }

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
        {groups.map((group) =>
          group.length > 1 ? (
            <ShipmentGroup key={group[0].shipmentId} orders={group} />
          ) : (
            <li key={group[0].id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Link to={`/orders/${group[0].id}`} className="font-medium text-ink hover:text-persimmon">
                Order {group[0].id.slice(0, 8)} — {group[0].items.length} item(s)
              </Link>
              <OrderStatusBadge status={group[0].status} />
            </li>
          ),
        )}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
