import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMyShipments } from '../api/myShipments'
import { formatGrams, formatMoney } from '../lib/currency'
import { Modal } from '../components/Modal'
import { ShipmentStatusBadge } from '../components/ShipmentStatusBadge'
import { Spinner } from '../components/Spinner'
import { MyShipmentPage } from './MyShipmentPage'
import type { MemberShipmentDto } from '../types/api'

export function MyShipmentsListPage() {
  const { data: shipments, isLoading, isError } = useMyShipments()
  const [openShipmentId, setOpenShipmentId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  if (isLoading) return <Spinner fullPage label="Fetching shipments" />
  if (isError) return <p className="error-text">Could not load your shipments.</p>

  function openShipment(shipment: MemberShipmentDto) {
    queryClient.setQueryData(['shipments', 'mine', shipment.id], shipment)
    setOpenShipmentId(shipment.id)
  }

  return (
    <div>
      <h1 className="page-title mb-4">My shipments</h1>
      {shipments && shipments.length === 0 && (
        <p className="text-ink/50">
          No shipments yet — one is created automatically once you submit an order for shipping.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {shipments?.map((shipment) => (
          <li key={shipment.id}>
            <button
              type="button"
              onClick={() => openShipment(shipment)}
              className="card flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium text-ink">{shipment.title ?? `Shipment ${shipment.id.slice(0, 8)}`}</span>
              <span className="flex items-center gap-3 text-sm text-ink/60">
                <ShipmentStatusBadge status={shipment.status} />
                {shipment.members.length > 1 && <span>{shipment.members.length} members</span>}
                <span>{formatGrams(shipment.totalWeightGrams)}</span>
                {shipment.shippingCostEur != null && <span>{formatMoney(shipment.shippingCostEur, 'EUR')}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {openShipmentId && (
        <Modal onClose={() => setOpenShipmentId(null)}>
          <MyShipmentPage id={openShipmentId} onClose={() => setOpenShipmentId(null)} />
        </Modal>
      )}
    </div>
  )
}
