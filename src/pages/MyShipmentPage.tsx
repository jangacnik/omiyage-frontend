import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  useMarkShipmentArrived,
  useMyShipmentDetail,
  useUpdateMyShipmentShipping,
  useUpdateMyShipmentTitle,
} from '../api/myShipments'
import { useAuthStore } from '../store/authStore'
import { orderDisplayName } from '../api/orders'
import { DialogCloseButton } from '../components/DialogCloseButton'
import { Field } from '../components/Field'
import { IconButton } from '../components/IconButton'
import { OrderIdHint } from '../components/OrderIdHint'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { ShipmentStatusBadge } from '../components/ShipmentStatusBadge'
import { OrderItemStatusBadge } from '../components/OrderItemStatusBadge'
import { ButtonSpinner, Spinner } from '../components/Spinner'
import { CheckIcon, CloseIcon, CopyIcon, EditIcon } from '../components/icons'
import { formatGrams, formatMoney } from '../lib/currency'
import type { MemberShipmentDto, OrderDto, PendingAmountDto, ShipmentDestination, ShipmentMemberDto, ShippingMethod } from '../types/api'

const DESTINATIONS: ShipmentDestination[] = ['SLOVENIA', 'AUSTRIA']
const SHIPPING_METHODS: ShippingMethod[] = ['EMS', 'SMALL_PACKET', 'SURFACE_MAIL']
const METHOD_LABELS: Record<ShippingMethod, string> = {
  EMS: 'EMS',
  SMALL_PACKET: 'Small Packet (air, up to 2kg)',
  SURFACE_MAIL: 'Surface Mail (up to 2kg)',
}

function CopyTrackingNumber({ trackingNumber }: { trackingNumber: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(trackingNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <IconButton
      className="h-6 w-6"
      label={copied ? 'Copied' : 'Copy tracking number'}
      onClick={copy}
      icon={copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
    />
  )
}

function AmountList({ amounts }: { amounts: PendingAmountDto[] }) {
  if (amounts.length === 0) return <span className="text-muted">—</span>
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
        {order.orderWeightGrams != null && <span className="text-xs text-muted">{formatGrams(order.orderWeightGrams)}</span>}
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
      <p className="text-sm font-medium text-muted">{isMe ? 'You' : member.nickname ?? `Member ${member.userId.slice(0, 8)}`}</p>
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
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Shipment title" className="w-full sm:w-64">
          <input className="field-input" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </Field>
        <IconButton
          variant="primary"
          label="Save"
          onClick={() => updateTitle.mutate({ id, title: value.trim() || null }, { onSuccess: () => setEditing(false) })}
          disabled={updateTitle.isPending}
          icon={updateTitle.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
        />
        <IconButton label="Cancel" onClick={() => setEditing(false)} icon={<CloseIcon size={14} />} />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <h1 className="page-title">{title ?? 'Untitled shipment'}</h1>
      <IconButton label="Rename" onClick={() => setEditing(true)} icon={<EditIcon size={14} />} />
    </div>
  )
}

function ShippingEditor({ shipment, editable }: { shipment: MemberShipmentDto; editable: boolean }) {
  const [destination, setDestination] = useState<ShipmentDestination | ''>(shipment.destination ?? '')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | ''>(shipment.shippingMethod ?? '')
  const updateShipping = useUpdateMyShipmentShipping()

  const dirty = destination !== (shipment.destination ?? '') || shippingMethod !== (shipment.shippingMethod ?? '')

  function save() {
    updateShipping.mutate({
      id: shipment.id,
      destination: destination || undefined,
      shippingMethod: shippingMethod || undefined,
    })
  }

  if (!editable) {
    return (
      <>
        <span>Destination: {shipment.destination ?? '—'}</span>
        <span>Method: {shipment.shippingMethod ?? '—'}</span>
      </>
    )
  }

  return (
    <>
      <Field label="Destination" className="w-40">
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value as ShipmentDestination)}
          aria-label="Destination"
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
      </Field>
      <Field label="Shipping method" className="w-40">
        <select
          value={shippingMethod}
          onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
          aria-label="Shipping method"
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
      </Field>
      {dirty && (
        <IconButton
          variant="primary"
          label="Save"
          onClick={save}
          disabled={updateShipping.isPending}
          icon={updateShipping.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
        />
      )}
      {updateShipping.isError && <p className="error-text w-full">Could not save destination/shipping method.</p>}
    </>
  )
}

/** Doubles as a routed page (`/shipments/:id`) and as dialog content (id + onClose passed directly
 *  by a caller rendering it inside a Modal instead of navigating away). */
export function MyShipmentPage({ id: idProp, onClose }: { id?: string; onClose?: () => void } = {}) {
  const params = useParams<{ id: string }>()
  const id = idProp ?? params.id
  const { data: shipment, isLoading, isError } = useMyShipmentDetail(id)
  const markArrived = useMarkShipmentArrived()
  const myUserId = useAuthStore((s) => s.claims?.sub)

  if (isLoading) return <Spinner fullPage label="Fetching shipment" />
  if (isError || !shipment) {
    return (
      <div className="card relative py-4 text-center">
        {onClose && <DialogCloseButton onClose={onClose} />}
        <p className="error-text">Shipment not found.</p>
      </div>
    )
  }

  const isOwner = shipment.ownerUserId === myUserId

  return (
    <div
      className="card relative flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto"
    >
      {onClose && <DialogCloseButton onClose={onClose} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TitleEditor id={shipment.id} title={shipment.title} editable={isOwner} />
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm text-ink/80" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <ShippingEditor shipment={shipment} editable={isOwner && shipment.status === 'PREPARING'} />
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
