import { useParams } from 'react-router-dom'
import { useAdminShipments, useUpdateShipment } from '../../api/adminOrders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import type { ShipmentDto, ShipmentStatus } from '../../types/api'

const SHIPMENT_STATUSES: ShipmentStatus[] = ['PREPARING', 'SHIPPED', 'DELIVERED']

function ShipmentCard({ shipment, expanded }: { shipment: ShipmentDto; expanded: boolean }) {
  const updateShipment = useUpdateShipment()

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-ink">Shipment {shipment.id.slice(0, 8)}</h2>
          <span className="rounded-full bg-stone-light px-2.5 py-0.5 text-sm font-medium text-ink">{shipment.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={shipment.status}
            onChange={(e) => updateShipment.mutate({ id: shipment.id, status: e.target.value as ShipmentStatus })}
            aria-label={`Status for shipment ${shipment.id.slice(0, 8)}`}
            className="field-input py-1 text-sm"
          >
            {SHIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {updateShipment.isPending && <ButtonSpinner />}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink/50">Tracking number</span>
        <input
          defaultValue={shipment.trackingNumber ?? ''}
          onBlur={(e) => {
            if (e.target.value !== (shipment.trackingNumber ?? '')) {
              updateShipment.mutate({ id: shipment.id, trackingNumber: e.target.value })
            }
          }}
          placeholder="Not set"
          className="field-input max-w-xs"
        />
      </label>

      {expanded && (
        <div className="flex flex-col divide-y divide-stone-light border-t border-stone-light pt-2">
          {shipment.orders.map((order) => (
            <div key={order.id} className="flex flex-col gap-1 py-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">Order {order.id.slice(0, 8)}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <ul className="flex flex-wrap gap-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-1.5 text-sm text-ink/70">
                    {item.title} <OrderItemStatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

export function AdminShipmentsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: shipments, isLoading } = useAdminShipments()

  if (isLoading) return <Spinner fullPage label="Fetching shipments" />

  const visible = id ? shipments?.filter((s) => s.id === id) : shipments

  return (
    <div>
      <h1 className="page-title mb-4">Admin: Shipments</h1>
      {visible && visible.length === 0 && (
        <p className="text-ink/50">
          No shipments yet — select orders on the <a href="/admin/orders" className="text-persimmon hover:underline">Orders</a> page
          and combine them into one.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {visible?.map((shipment) => (
          <ShipmentCard key={shipment.id} shipment={shipment} expanded />
        ))}
      </ul>
    </div>
  )
}
