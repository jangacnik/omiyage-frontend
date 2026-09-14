import { Link } from 'react-router-dom'
import { useMyShipments } from '../api/myShipments'
import { formatGrams, formatMoney } from '../lib/currency'
import { Spinner } from '../components/Spinner'

export function MyShipmentsListPage() {
  const { data: shipments, isLoading, isError } = useMyShipments()

  if (isLoading) return <Spinner fullPage label="Fetching shipments" />
  if (isError) return <p className="error-text">Could not load your shipments.</p>

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
            <Link
              to={`/shipments/${shipment.id}`}
              className="card flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium text-ink">{shipment.title ?? `Shipment ${shipment.id.slice(0, 8)}`}</span>
              <span className="flex items-center gap-3 text-sm text-ink/60">
                <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-ink">{shipment.status}</span>
                {shipment.members.length > 1 && <span>{shipment.members.length} members</span>}
                <span>{formatGrams(shipment.totalWeightGrams)}</span>
                {shipment.shippingCostEur != null && <span>{formatMoney(shipment.shippingCostEur, 'EUR')}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
