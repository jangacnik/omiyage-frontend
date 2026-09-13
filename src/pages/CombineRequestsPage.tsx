import {
  useAcceptCombineRequest,
  useCancelCombineRequest,
  useDeclineCombineRequest,
  useIncomingCombineRequests,
  useOutgoingCombineRequests,
} from '../api/combineRequests'
import { OrderIdHint } from '../components/OrderIdHint'
import { ButtonSpinner, Spinner } from '../components/Spinner'
import type { CombineRequestDto, ShipmentSummaryDto } from '../types/api'

function OrderSummary({ id, nickname }: { id: string; nickname: string | null }) {
  return (
    <span className="font-medium text-ink">
      {nickname ?? id.slice(0, 8)}
      <OrderIdHint id={id} nickname={nickname} />
    </span>
  )
}

function ShipmentSummary({ shipment }: { shipment: ShipmentSummaryDto }) {
  return <span className="font-medium text-ink">{shipment.title ?? `shipment ${shipment.id.slice(0, 8)}`}</span>
}

function IncomingRow({ request }: { request: CombineRequestDto }) {
  const accept = useAcceptCombineRequest()
  const decline = useDeclineCombineRequest()

  return (
    <li className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink/80">
        <OrderSummary id={request.requesterOrder.id} nickname={request.requesterOrder.nickname} /> wants to join your{' '}
        <ShipmentSummary shipment={request.targetShipment} />
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={() => accept.mutate(request.id)} disabled={accept.isPending}>
          {accept.isPending ? <ButtonSpinner /> : 'Accept'}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => decline.mutate(request.id)} disabled={decline.isPending}>
          {decline.isPending ? <ButtonSpinner /> : 'Decline'}
        </button>
      </div>
      {(accept.isError || decline.isError) && <p className="error-text">Could not update this request.</p>}
    </li>
  )
}

function OutgoingRow({ request }: { request: CombineRequestDto }) {
  const cancel = useCancelCombineRequest()

  return (
    <li className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink/80">
        Your order <OrderSummary id={request.requesterOrder.id} nickname={request.requesterOrder.nickname} /> asked to join{' '}
        <ShipmentSummary shipment={request.targetShipment} /> — waiting for them to respond.
      </p>
      <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => cancel.mutate(request.id)} disabled={cancel.isPending}>
        {cancel.isPending ? <ButtonSpinner /> : 'Cancel'}
      </button>
      {cancel.isError && <p className="error-text">Could not cancel this request.</p>}
    </li>
  )
}

export function CombineRequestsPage() {
  const incoming = useIncomingCombineRequests()
  const outgoing = useOutgoingCombineRequests()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Combine requests</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-ink">Incoming</h2>
        {incoming.isLoading && <Spinner label="Fetching requests" />}
        {incoming.data && incoming.data.length === 0 && <p className="text-ink/50">Nothing waiting on you.</p>}
        <ul className="flex flex-col gap-2">
          {incoming.data?.map((request) => <IncomingRow key={request.id} request={request} />)}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-ink">Outgoing</h2>
        {outgoing.isLoading && <Spinner label="Fetching requests" />}
        {outgoing.data && outgoing.data.length === 0 && <p className="text-ink/50">You haven't sent any requests.</p>}
        <ul className="flex flex-col gap-2">
          {outgoing.data?.map((request) => <OutgoingRow key={request.id} request={request} />)}
        </ul>
      </section>
    </div>
  )
}
