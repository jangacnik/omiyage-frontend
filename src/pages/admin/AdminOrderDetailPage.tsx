import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useOrder } from '../../api/orders'
import { useAdminShipments, useAssignOrderShipment, useUpdateOrderItem, useUpdateOrderStatus } from '../../api/adminOrders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { ORDER_ITEM_STATUSES, OrderItemStatusBadge } from '../../components/OrderItemStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { mediaUrl } from '../../lib/media'
import type { OrderItemDto, OrderItemStatus, OrderStatus } from '../../types/api'

const STATUSES: OrderStatus[] = ['REQUESTED', 'IN_PROGRESS', 'PURCHASED', 'SENT', 'DELIVERED', 'CANCELLED']

function AdminItemRow({ orderId, item }: { orderId: string; item: OrderItemDto }) {
  const [actualPrice, setActualPrice] = useState(item.actualPrice?.toString() ?? '')
  const [weight, setWeight] = useState(item.weight?.toString() ?? '')
  const updateItem = useUpdateOrderItem()

  function save(status: OrderItemStatus) {
    updateItem.mutate({
      orderId,
      itemId: item.id,
      status,
      actualPrice: actualPrice ? Number(actualPrice) : undefined,
      weight: weight ? Number(weight) : undefined,
    })
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-light">
        {item.imageKey && <img src={mediaUrl(item.imageKey)} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{item.title}</p>
        {item.description && <p className="text-sm text-ink/60">{item.description}</p>}
        <p className="mt-1 text-sm text-ink/60">
          {item.currency} {item.maxPrice ?? '—'} max · qty {item.quantity}
        </p>
        <div className="mt-1">
          <OrderItemStatusBadge status={item.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 sm:w-auto">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Buy price</span>
          <input
            value={actualPrice}
            onChange={(e) => setActualPrice(e.target.value)}
            aria-label={`Buy price for ${item.title}`}
            className="field-input w-28 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Weight (g)</span>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            aria-label={`Weight for ${item.title}`}
            className="field-input w-24 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink/50">Status</span>
          <select
            value={item.status}
            onChange={(e) => save(e.target.value as OrderItemStatus)}
            aria-label={`Status for ${item.title}`}
            className="field-input w-32 py-1"
          >
            {ORDER_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary px-2 py-1 text-xs"
          onClick={() => save(item.status)}
          disabled={updateItem.isPending}
        >
          {updateItem.isPending ? <ButtonSpinner /> : 'Save price/weight'}
        </button>
      </div>
    </li>
  )
}

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)
  const updateStatus = useUpdateOrderStatus()
  const { data: shipments } = useAdminShipments()
  const assignShipment = useAssignOrderShipment()

  if (isLoading) return <Spinner fullPage label="Fetching order" />
  if (isError || !order) return <p className="error-text">Order not found.</p>

  const totalPrice = order.items.reduce((sum, item) => sum + (item.actualPrice ?? item.maxPrice ?? 0) * item.quantity, 0)
  const totalWeight = order.items.reduce((sum, item) => sum + (item.weight ?? 0) * item.quantity, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title">Order {order.id.slice(0, 8)}</h1>
        <OrderStatusBadge status={order.status} />
        {updateStatus.isPending && <ButtonSpinner />}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="field-label">Order status</span>
          <select
            value={order.status}
            onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })}
            aria-label="Update order status"
            className="field-input max-w-xs"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="field-label">Shipment</span>
          <select
            value={order.shipmentId ?? ''}
            onChange={(e) => assignShipment.mutate({ orderId: order.id, shipmentId: e.target.value || null })}
            aria-label="Assign to shipment"
            className="field-input max-w-xs"
          >
            <option value="">Not in a shipment</option>
            {shipments?.map((s) => (
              <option key={s.id} value={s.id}>
                Shipment {s.id.slice(0, 8)} ({s.status})
              </option>
            ))}
          </select>
        </label>
      </div>

      {order.notes && <p className="text-ink/70">{order.notes}</p>}

      <ul className="card divide-y divide-stone-light">
        {order.items.map((item) => (
          <AdminItemRow key={item.id} orderId={order.id} item={item} />
        ))}
      </ul>

      <div className="card flex flex-wrap gap-6 font-medium text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span>Total price: {totalPrice.toFixed(2)}</span>
        <span>Total weight: {totalWeight.toFixed(0)} g</span>
      </div>
    </div>
  )
}
