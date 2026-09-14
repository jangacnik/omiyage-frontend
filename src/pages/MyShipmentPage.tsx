import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMarkShipmentArrived, useMyShipmentDetail, useUpdateMyShipmentTitle } from '../api/myShipments'
import { useAuthStore } from '../store/authStore'
import { orderDisplayName } from '../api/orders'
import { OrderIdHint } from '../components/OrderIdHint'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { OrderItemStatusBadge } from '../components/OrderItemStatusBadge'
import { ButtonSpinner, Spinner } from '../components/Spinner'
import { formatGrams, formatMoney } from '../lib/currency'
import type { OrderDto, PendingAmountDto, ShipmentMemberDto } from '../types/api'

function CopyTrackingNumber({ trackingNumber }: { trackingNumber: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(trackingNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button type="button" className="btn-secondary px-2 py-0.5 text-xs" onClick={copy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function AmountList({ amounts }: { amounts: PendingAmountDto[] }) {
  if (amounts.length === 0) return <span className="text-ink/50">—</span>
  return <>{amounts.map((a) => formatMoney(a.amount, a.currency)).join(' + ')}</>
}

// Item totals here are always EUR (see MemberShipmentDtos.kt) - safe to sum with the EUR shipping
// share/cost into one combined figure.
function eurAmount(amounts: PendingAmountDto[]): number {
  return amounts.filter((a) => a.currency === 'EUR').reduce((sum, a) => sum + a.amount, 0)
}

function MemberOrderRow({ order }: { order: OrderDto }) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink">
          Order {orderDisplayName(order)}
          <OrderIdHint id={order.id} nickname={order.nickname} />
        </span>
        <OrderStatusBadge status={order.status} />
        {order.orderWeightGrams != null && <span className="text-xs text-ink/50">{formatGrams(order.orderWeightGrams)}</span>}
      </div>
      <ul className="flex flex-wrap gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5 text-sm text-ink/70">
            {item.title} <OrderItemStatusBadge status={item.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function MemberSection({ member, isMe }: { member: ShipmentMemberDto; isMe: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-t border-mist pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink/60">{isMe ? 'You' : `Member ${member.userId.slice(0, 8)}`}</p>
        <p className="text-sm font-medium text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <AmountList amounts={member.itemTotals} />
          {member.shippingShareEur != null && (
            <>
              {' '}
              + {formatMoney(member.shippingShareEur, 'EUR')} shipping ={' '}
              {formatMoney(eurAmount(member.itemTotals) + member.shippingShareEur, 'EUR')} total
            </>
          )}
        </p>
      </div>
      <div className="flex flex-col divide-y divide-mist">
        {member.orders.map((order) => (
          <MemberOrderRow key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}

function TitleEditor({ id, title, editable }: { id: string; title: string | null; editable: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title ?? '')
  const updateTitle = useUpdateMyShipmentTitle()

  if (!editable) {
    return <h1 className="page-title">{title ?? 'Shipment'}</h1>
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input className="field-input sm:w-64" value={value} onChange={(e) => setValue(e.target.value)} autoFocus aria-label="Shipment title" />
        <button
          type="button"
          className="btn-primary px-3 py-1.5 text-sm"
          onClick={() => updateTitle.mutate({ id, title: value.trim() || null }, { onSuccess: () => setEditing(false) })}
          disabled={updateTitle.isPending}
        >
          {updateTitle.isPending ? <ButtonSpinner /> : 'Save'}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <h1 className="page-title">{title ?? 'Untitled shipment'}</h1>
      <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(true)}>
        Rename
      </button>
    </div>
  )
}

export function MyShipmentPage() {
  const { id } = useParams<{ id: string }>()
  const { data: shipment, isLoading, isError } = useMyShipmentDetail(id)
  const markArrived = useMarkShipmentArrived()
  const myUserId = useAuthStore((s) => s.claims?.sub)

  if (isLoading) return <Spinner fullPage label="Fetching shipment" />
  if (isError || !shipment) return <p className="error-text">Shipment not found.</p>

  const isOwner = shipment.ownerUserId === myUserId

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TitleEditor id={shipment.id} title={shipment.title} editable={isOwner} />
        <span className="rounded-full bg-mist px-2.5 py-0.5 text-sm font-medium text-ink">{shipment.status}</span>
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-ink/80" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span>Destination: {shipment.destination ?? '—'}</span>
        <span>Method: {shipment.shippingMethod ?? '—'}</span>
        <span className="flex items-center gap-2">
          Tracking: {shipment.trackingNumber ?? '—'}
          {shipment.trackingNumber && <CopyTrackingNumber trackingNumber={shipment.trackingNumber} />}
        </span>
        <span>Weight: {formatGrams(shipment.totalWeightGrams)}</span>
        <span>
          Shipping cost: {shipment.shippingCostEur != null ? formatMoney(shipment.shippingCostEur, 'EUR') : '—'}
        </span>
        {shipment.shippedAt && <span>Shipped: {new Date(shipment.shippedAt).toLocaleString()}</span>}
        {shipment.arrivedAt && <span>Arrived: {new Date(shipment.arrivedAt).toLocaleString()}</span>}
      </div>

      {isOwner && shipment.status === 'SHIPPED' && (
        <button
          type="button"
          className="btn-primary self-start px-3 py-1.5 text-sm"
          onClick={() => markArrived.mutate(shipment.id)}
          disabled={markArrived.isPending}
        >
          {markArrived.isPending ? <ButtonSpinner /> : 'Mark as arrived'}
        </button>
      )}
      {markArrived.isError && <p className="error-text">Could not mark this shipment as arrived.</p>}

      <div className="flex flex-col gap-3">
        {shipment.members.map((member) => (
          <MemberSection key={member.userId} member={member} isMe={member.userId === myUserId} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-mist pt-3">
        <span className="font-medium text-ink">Shipment grand total</span>
        <span className="font-semibold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <AmountList amounts={shipment.grandTotalItemTotals} />
          {shipment.shippingCostEur != null && (
            <>
              {' '}
              + {formatMoney(shipment.shippingCostEur, 'EUR')} shipping ={' '}
              {formatMoney(eurAmount(shipment.grandTotalItemTotals) + shipment.shippingCostEur, 'EUR')} total
            </>
          )}
        </span>
      </div>
    </div>
  )
}
