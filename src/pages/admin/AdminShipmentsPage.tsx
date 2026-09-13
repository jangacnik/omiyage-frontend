import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAdminDeleteShipment, useAdminShipments, useUpdateShipment } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { useConfirm } from '../../components/ConfirmDialog'
import { formatGrams, formatMoney } from '../../lib/currency'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { TrashIcon } from '../../components/icons'
import { AdminOrderEditor } from './AdminOrderEditor'
import type { OrderDto, ShipmentDestination, ShipmentDto, ShipmentStatus, ShippingMethod } from '../../types/api'

const SHIPMENT_STATUSES: ShipmentStatus[] = ['PREPARING', 'SHIPPED', 'DELIVERED']
const DESTINATIONS: ShipmentDestination[] = ['SLOVENIA', 'AUSTRIA']
const SHIPPING_METHODS: ShippingMethod[] = ['EMS', 'SMALL_PACKET', 'SURFACE_MAIL']
const METHOD_LABELS: Record<ShippingMethod, string> = {
  EMS: 'EMS',
  SMALL_PACKET: 'Small Packet (air, up to 2kg)',
  SURFACE_MAIL: 'Surface Mail (up to 2kg)',
}

function ShipmentOrderRow({ order }: { order: OrderDto }) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink hover:text-forest">
          Order {orderDisplayName(order)}
        </Link>
        <OrderIdHint id={order.id} nickname={order.nickname} />
        <OrderStatusBadge status={order.status} />
        {order.orderWeightGrams != null && (
          <span className="text-xs text-ink/50">{formatGrams(order.orderWeightGrams)}</span>
        )}
        {order.shippingCostShareJpy != null && (
          <span className="text-xs font-medium text-ink">{formatMoney(order.shippingCostShareJpy, 'JPY')} shipping</span>
        )}
        <button type="button" className="btn-secondary ml-auto px-2 py-1 text-xs" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <AdminOrderEditor order={order} />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5 text-sm text-ink/70">
              {item.title} <OrderItemStatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ShipmentCard({ shipment, expanded }: { shipment: ShipmentDto; expanded: boolean }) {
  const updateShipment = useUpdateShipment()
  const deleteShipment = useAdminDeleteShipment()
  const confirm = useConfirm()

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete shipment',
      message: 'Delete this shipment? Its orders are kept, just detached - this cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteShipment.mutate(shipment.id)
  }

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-ink">Shipment {shipment.id.slice(0, 8)}</h2>
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-sm font-medium text-ink">{shipment.status}</span>
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
          <button
            type="button"
            className="btn-danger px-2 py-1 text-xs"
            onClick={handleDelete}
            disabled={deleteShipment.isPending}
          >
            {deleteShipment.isPending ? <ButtonSpinner /> : (
              <>
                <TrashIcon size={13} /> Delete
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Destination</span>
          <select
            value={shipment.destination ?? ''}
            onChange={(e) =>
              updateShipment.mutate({ id: shipment.id, destination: e.target.value as ShipmentDestination })
            }
            aria-label={`Destination for shipment ${shipment.id.slice(0, 8)}`}
            className="field-input py-1 text-sm"
          >
            <option value="" disabled>
              Not set
            </option>
            {DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {d[0] + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Shipping method</span>
          <select
            value={shipment.shippingMethod ?? ''}
            onChange={(e) =>
              updateShipment.mutate({ id: shipment.id, shippingMethod: e.target.value as ShippingMethod })
            }
            aria-label={`Shipping method for shipment ${shipment.id.slice(0, 8)}`}
            className="field-input py-1 text-sm"
          >
            <option value="" disabled>
              Not set
            </option>
            {SHIPPING_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

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
            className="field-input max-w-xs py-1 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-ink/80" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span>Total weight: {formatGrams(shipment.totalWeightGrams)}</span>
        <span>
          Shipping cost:{' '}
          {shipment.shippingCostJpy != null ? (
            <strong className="text-ink">{formatMoney(shipment.shippingCostJpy, 'JPY')}</strong>
          ) : (
            <span className="text-ink/50">
              {shipment.destination && shipment.shippingMethod
                ? 'too heavy for this method'
                : 'set destination + method'}
            </span>
          )}
        </span>
        {shipment.estimatedDays != null && <span>Estimated: ~{shipment.estimatedDays} days</span>}
      </div>

      {deleteShipment.isError && <p className="error-text">Could not delete this shipment.</p>}

      {expanded && (
        <div className="flex flex-col divide-y divide-mist border-t border-mist pt-2">
          {shipment.orders.map((order) => (
            <ShipmentOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </li>
  )
}

export function AdminShipmentsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: shipments, isLoading } = useAdminShipments()
  const navigate = useNavigate()

  if (isLoading) return <Spinner fullPage label="Fetching shipments" />

  const visible = id ? shipments?.filter((s) => s.id === id) : shipments

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {id && (
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => navigate('/admin/shipments')}>
            ← Back to shipments
          </button>
        )}
        <h1 className="page-title">Admin: Shipments</h1>
      </div>
      {visible && visible.length === 0 && (
        <p className="text-ink/50">
          No shipments yet — select orders on the <Link to="/admin/orders" className="text-forest hover:underline">Orders</Link> page
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
