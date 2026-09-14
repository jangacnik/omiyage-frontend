import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useAdminDeleteShipment,
  useAdminMarkShipmentPaid,
  useAdminShipments,
  useCombineShipments,
  useSplitShipment,
  useUpdateShipment,
} from '../../api/adminOrders'
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

function ShipmentOrderRow({
  order,
  splitSelected,
  onToggleSplit,
}: {
  order: OrderDto
  splitSelected?: boolean
  onToggleSplit?: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {onToggleSplit && (
          <input
            type="checkbox"
            checked={splitSelected}
            onChange={onToggleSplit}
            aria-label={`Select order ${order.id.slice(0, 8)} to split off`}
          />
        )}
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

function ShipmentCard({
  shipment,
  expanded,
  selected,
  onToggleSelect,
}: {
  shipment: ShipmentDto
  expanded: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const updateShipment = useUpdateShipment()
  const deleteShipment = useAdminDeleteShipment()
  const splitShipment = useSplitShipment()
  const markShipmentPaid = useAdminMarkShipmentPaid()
  const confirm = useConfirm()
  const [splitSelection, setSplitSelection] = useState<string[]>([])
  const items = shipment.orders.flatMap((order) => order.items)
  const allPaid = items.length > 0 && items.every((item) => item.paid)

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete shipment',
      message: 'Delete this shipment? Its orders are kept, just detached - this cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteShipment.mutate(shipment.id)
  }

  async function handleStatusChange(newStatus: ShipmentStatus) {
    if (newStatus === 'SHIPPED') {
      const ok = await confirm({
        title: 'Mark as shipped',
        message: 'Mark this shipment as shipped? This records the shipped date and locks its order list.',
        confirmLabel: 'Mark shipped',
      })
      if (!ok) return
    }
    updateShipment.mutate({ id: shipment.id, status: newStatus })
  }

  function toggleSplitOrder(orderId: string) {
    setSplitSelection((current) => (current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]))
  }

  function handleSplit() {
    splitShipment.mutate(
      { shipmentId: shipment.id, orderIds: splitSelection },
      { onSuccess: () => setSplitSelection([]) },
    )
  }

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Select shipment ${shipment.id.slice(0, 8)} to combine`}
            />
          )}
          <h2 className="font-medium text-ink">{shipment.title ?? `Shipment ${shipment.id.slice(0, 8)}`}</h2>
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-sm font-medium text-ink">{shipment.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={shipment.status}
            onChange={(e) => handleStatusChange(e.target.value as ShipmentStatus)}
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
            className="btn-secondary px-2 py-1 text-xs"
            onClick={() => markShipmentPaid.mutate({ shipmentId: shipment.id, paid: !allPaid })}
            disabled={markShipmentPaid.isPending || items.length === 0}
          >
            {markShipmentPaid.isPending ? <ButtonSpinner /> : allPaid ? 'Mark shipment unpaid' : 'Mark shipment paid'}
          </button>
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
            placeholder="Not set — can be added any time, including after shipping"
            className="field-input max-w-xs py-1 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Title</span>
          <input
            defaultValue={shipment.title ?? ''}
            onBlur={(e) => {
              if (e.target.value !== (shipment.title ?? '')) {
                updateShipment.mutate({ id: shipment.id, title: e.target.value })
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
            <strong className="text-ink">
              {formatMoney(shipment.shippingCostJpy, 'JPY')}
              {shipment.shippingCostEur != null && <> ({formatMoney(shipment.shippingCostEur, 'EUR')})</>}
            </strong>
          ) : (
            <span className="text-ink/50">
              {shipment.destination && shipment.shippingMethod
                ? 'too heavy for this method'
                : 'set destination + method'}
            </span>
          )}
        </span>
        {shipment.estimatedDays != null && <span>Estimated: ~{shipment.estimatedDays} days</span>}
        {/* profit sums each order's profit, which is always EUR - see OrderDtos.profit() */}
        <span>Profit: <strong className="text-ink">{formatMoney(shipment.profit, 'EUR')}</strong></span>
        {shipment.shippedAt && <span>Shipped: {new Date(shipment.shippedAt).toLocaleString()}</span>}
        {shipment.arrivedAt && <span>Arrived: {new Date(shipment.arrivedAt).toLocaleString()}</span>}
      </div>

      {deleteShipment.isError && <p className="error-text">Could not delete this shipment.</p>}
      {markShipmentPaid.isError && <p className="error-text">Could not update paid status for this shipment.</p>}
      {updateShipment.isError && (
        <p className="error-text">
          {updateShipment.error instanceof Error ? updateShipment.error.message : 'Could not update this shipment.'}
        </p>
      )}

      {expanded && (
        <div className="flex flex-col divide-y divide-mist border-t border-mist pt-2">
          {shipment.orders.map((order) => (
            <ShipmentOrderRow
              key={order.id}
              order={order}
              splitSelected={splitSelection.includes(order.id)}
              onToggleSplit={shipment.orders.length > 1 ? () => toggleSplitOrder(order.id) : undefined}
            />
          ))}
          {shipment.orders.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-sm"
                onClick={handleSplit}
                disabled={splitSelection.length === 0 || splitSelection.length === shipment.orders.length || splitShipment.isPending}
              >
                {splitShipment.isPending ? <ButtonSpinner /> : 'Split selected into new shipment'}
              </button>
              {splitShipment.isError && <p className="error-text">Could not split this shipment.</p>}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export function AdminShipmentsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: shipments, isLoading } = useAdminShipments()
  const navigate = useNavigate()
  const combineShipments = useCombineShipments()
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([])

  if (isLoading) return <Spinner fullPage label="Fetching shipments" />

  const visible = id ? shipments?.filter((s) => s.id === id) : shipments

  function toggleShipment(shipmentId: string) {
    setSelectedShipmentIds((current) =>
      current.includes(shipmentId) ? current.filter((sid) => sid !== shipmentId) : [...current, shipmentId],
    )
  }

  function handleCombine() {
    combineShipments.mutate(
      { shipmentIds: selectedShipmentIds },
      { onSuccess: () => setSelectedShipmentIds([]) },
    )
  }

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

      {!id && selectedShipmentIds.length >= 2 && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-mist px-3 py-2">
          <span className="text-sm text-ink">{selectedShipmentIds.length} shipments selected</span>
          <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={handleCombine} disabled={combineShipments.isPending}>
            {combineShipments.isPending ? <ButtonSpinner /> : 'Combine selected shipments'}
          </button>
        </div>
      )}
      {combineShipments.isError && <p className="error-text mb-2">Could not combine these shipments.</p>}

      <ul className="flex flex-col gap-3">
        {visible?.map((shipment) => (
          <ShipmentCard
            key={shipment.id}
            shipment={shipment}
            expanded
            selected={selectedShipmentIds.includes(shipment.id)}
            onToggleSelect={id ? undefined : () => toggleShipment(shipment.id)}
          />
        ))}
      </ul>
    </div>
  )
}
