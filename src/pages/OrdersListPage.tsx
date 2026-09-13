import { useState } from 'react'
import { Link } from 'react-router-dom'
import { orderDisplayName, useMergeMyOrders, useMyOrders } from '../api/orders'
import { CombineRequestModal } from '../components/CombineRequestModal'
import { useConfirm } from '../components/ConfirmDialog'
import { OrderIdHint } from '../components/OrderIdHint'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { Spinner, ButtonSpinner } from '../components/Spinner'
import type { OrderDto } from '../types/api'

function ShipmentGroup({ orders }: { orders: OrderDto[] }) {
  const [activeId, setActiveId] = useState(orders[0].id)
  const active = orders.find((o) => o.id === activeId) ?? orders[0]

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link to={`/shipments/${active.shipmentId}`} className="text-sm font-medium text-ink/60 hover:text-forest hover:underline">
          Shipment {active.shipmentId?.slice(0, 8)}
        </Link>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-mist pb-2">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => setActiveId(order.id)}
            className={`nav-link ${order.id === activeId ? 'bg-mist text-ink' : ''}`}
          >
            Order {orderDisplayName(order)}
            <OrderIdHint id={order.id} nickname={order.nickname} />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Link to={`/orders/${active.id}`} className="font-medium text-ink hover:text-forest">
          {active.items.length} item(s)
        </Link>
        <OrderStatusBadge status={active.status} />
      </div>
    </li>
  )
}

export function OrdersListPage() {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [combiningOrderId, setCombiningOrderId] = useState<string | null>(null)
  const { data, isLoading, isError } = useMyOrders(page)
  const mergeOrders = useMergeMyOrders()
  const confirm = useConfirm()

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

  function toggleSelected(orderId: string) {
    setMergeError(null)
    setSelected((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId],
    )
  }

  async function mergeSelected() {
    const ok = await confirm({
      title: 'Merge orders',
      message: `Merge these ${selected.length} orders into one? The items all move into a single order and the others are removed.`,
      confirmLabel: 'Merge',
    })
    if (!ok) return
    mergeOrders.mutate(selected, {
      onSuccess: () => {
        setSelected([])
        setMergeError(null)
      },
      onError: (error) => setMergeError(error instanceof Error ? error.message : 'could not merge these orders'),
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">My orders</h1>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link to="/combine-requests" className="btn-secondary">
            Combine requests
          </Link>
          <Link to="/orders/new" className="btn-primary">
            New request
          </Link>
        </div>
      </div>

      {isLoading && <Spinner label="Fetching orders" />}
      {isError && <p className="error-text">Could not load orders.</p>}
      {data && data.content.length === 0 && <p className="text-ink/50">No orders yet.</p>}
      {mergeError && <p className="error-text mb-2">{mergeError}</p>}

      {selected.length >= 2 && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-mist px-3 py-2">
          <span className="text-sm text-ink">{selected.length} orders selected</span>
          <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={mergeSelected} disabled={mergeOrders.isPending}>
            {mergeOrders.isPending ? <ButtonSpinner /> : 'Merge selected'}
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {groups.map((group) =>
          group.length > 1 ? (
            <ShipmentGroup key={group[0].shipmentId} orders={group} />
          ) : (
            <li key={group[0].id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(group[0].id)}
                  onChange={() => toggleSelected(group[0].id)}
                  aria-label={`Select order ${group[0].id.slice(0, 8)} to merge`}
                />
                <Link to={`/orders/${group[0].id}`} className="font-medium text-ink hover:text-forest">
                  Order {orderDisplayName(group[0])}
                  <OrderIdHint id={group[0].id} nickname={group[0].nickname} /> — {group[0].items.length} item(s)
                </Link>
              </div>
              <div className="flex items-center gap-2">
                {group[0].open && (
                  <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setCombiningOrderId(group[0].id)}>
                    Combine with…
                  </button>
                )}
                <OrderStatusBadge status={group[0].status} />
              </div>
            </li>
          ),
        )}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {combiningOrderId && <CombineRequestModal orderId={combiningOrderId} onClose={() => setCombiningOrderId(null)} />}
    </div>
  )
}
