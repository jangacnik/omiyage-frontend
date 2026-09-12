import { useParams } from 'react-router-dom'
import { useAdminDeleteShipment, useAdminShipments, useUpdateShipment } from '../../api/adminOrders'
import { orderDisplayName } from '../../api/orders'
import { useConfirm } from '../../components/ConfirmDialog'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { TrashIcon } from '../../components/icons'
import type { ShipmentDestination, ShipmentDto, ShipmentStatus, ShippingMethod } from '../../types/api'

const SHIPMENT_STATUSES: ShipmentStatus[] = ['PREPARING', 'SHIPPED', 'DELIVERED']
const DESTINATIONS: ShipmentDestination[] = ['SLOVENIA', 'AUSTRIA']
const SHIPPING_METHODS: ShippingMethod[] = ['EMS', 'SMALL_PACKET', 'SURFACE_MAIL']
const METHOD_LABELS: Record<ShippingMethod, string> = {
  EMS: 'EMS',
  SMALL_PACKET: 'Small Packet (air, up to 2kg)',
  SURFACE_MAIL: 'Surface Mail (up to 2kg)',
}

function formatGrams(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`
}

function formatJpy(amount: number): string {
  return `¥${amount.toLocaleString('en-US')}`
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
            <strong className="text-ink">{formatJpy(shipment.shippingCostJpy)}</strong>
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

      {expanded && (
        <div className="flex flex-col divide-y divide-mist border-t border-mist pt-2">
          {shipment.orders.map((order) => (
            <div key={order.id} className="flex flex-col gap-1 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">
                  Order {orderDisplayName(order)}
                  <OrderIdHint id={order.id} nickname={order.nickname} />
                </span>
                <OrderStatusBadge status={order.status} />
                {order.orderWeightGrams != null && (
                  <span className="text-xs text-ink/50">{formatGrams(order.orderWeightGrams)}</span>
                )}
                {order.shippingCostShareJpy != null && (
                  <span className="text-xs font-medium text-ink">
                    {formatJpy(order.shippingCostShareJpy)} shipping
                  </span>
                )}
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
          No shipments yet — select orders on the <a href="/admin/orders" className="text-forest hover:underline">Orders</a> page
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
