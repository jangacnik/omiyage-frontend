import { useNavigate, useParams } from 'react-router-dom'
import { orderDisplayName, useOrder } from '../../api/orders'
import { useAdminDeleteOrder, useAdminShipments, useAssignOrderShipment } from '../../api/adminOrders'
import { useConfirm } from '../../components/ConfirmDialog'
import { DialogCloseButton } from '../../components/DialogCloseButton'
import { OrderIdHint } from '../../components/OrderIdHint'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { TrashIcon } from '../../components/icons'
import { formatMoney } from '../../lib/currency'
import { AdminOrderEditor } from './AdminOrderEditor'

/** Doubles as a routed page (`/admin/orders/:id`) and as dialog content (id + onClose passed
 *  directly by a caller rendering it inside a Modal instead of navigating away). */
export function AdminOrderDetailPage({ id: idProp, onClose }: { id?: string; onClose?: () => void } = {}) {
  const params = useParams<{ id: string }>()
  const id = idProp ?? params.id
  const { data: order, isLoading, isError } = useOrder(id)
  const { data: shipments } = useAdminShipments()
  const assignShipment = useAssignOrderShipment()
  const deleteOrder = useAdminDeleteOrder()
  const confirm = useConfirm()
  const navigate = useNavigate()

  if (isLoading) return <Spinner fullPage label="Fetching order" />
  if (isError || !order) {
    return (
      <div className="card relative py-4 text-center">
        {onClose && <DialogCloseButton onClose={onClose} />}
        <p className="error-text">Order not found.</p>
      </div>
    )
  }

  // soldPrice and maxPrice are both always EUR, unlike actualPrice (the JPY bought-for cost).
  const totalPrice = order.items.reduce((sum, item) => sum + (item.soldPrice ?? item.maxPrice ?? 0) * item.quantity, 0)
  const totalWeight = order.items.reduce((sum, item) => sum + (item.weight ?? 0) * item.quantity, 0)

  async function handleDelete() {
    if (!order) return
    const ok = await confirm({
      title: 'Delete order',
      message: `Delete this order? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteOrder.mutateAsync(order.id)
      if (onClose) {
        onClose()
      } else {
        navigate('/admin/orders')
      }
    } catch {
      // deleteOrder.isError renders the message below - nothing else to do here.
    }
  }

  return (
    <div
      className="card relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto"
      role={onClose ? 'dialog' : undefined}
      aria-modal={onClose ? true : undefined}
      aria-labelledby={onClose ? 'admin-order-detail-title' : undefined}
    >
      {onClose && <DialogCloseButton onClose={onClose} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="admin-order-detail-title" className="page-title">
          Order {orderDisplayName(order)}
          <OrderIdHint id={order.id} nickname={order.nickname} />
        </h1>
        <OrderStatusBadge status={order.status} />
        <button type="button" className="btn-danger ml-auto px-3 py-1.5 text-sm" onClick={handleDelete} disabled={deleteOrder.isPending}>
          {deleteOrder.isPending ? <ButtonSpinner /> : (
            <>
              <TrashIcon size={13} /> Delete order
            </>
          )}
        </button>
      </div>
      {deleteOrder.isError && <p className="error-text">Could not delete this order.</p>}

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

      {order.notes && <p className="text-ink/70">{order.notes}</p>}

      <AdminOrderEditor order={order} />

      <div className="card flex flex-wrap gap-6 font-medium text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span>Total price: {formatMoney(totalPrice, 'EUR')}</span>
        <span>Total weight: {totalWeight.toFixed(0)} g</span>
      </div>
    </div>
  )
}
