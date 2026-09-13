import { useAdminCombineRequests, useAdminForceAcceptCombineRequest } from '../../api/adminOrders'
import { OrderIdHint } from '../../components/OrderIdHint'
import { ButtonSpinner, Spinner } from '../../components/Spinner'

export function AdminCombineRequestsPage() {
  const { data, isLoading } = useAdminCombineRequests()
  const forceAccept = useAdminForceAcceptCombineRequest()

  if (isLoading) return <Spinner fullPage label="Fetching combine requests" />

  return (
    <div>
      <h1 className="page-title mb-4">Admin: Combine requests</h1>
      {data && data.length === 0 && <p className="text-ink/50">No pending combine requests.</p>}
      <ul className="flex flex-col gap-2">
        {data?.map((request) => (
          <li key={request.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink/80">
              {request.requesterOrder.nickname ?? request.requesterOrder.id.slice(0, 8)}
              <OrderIdHint id={request.requesterOrder.id} nickname={request.requesterOrder.nickname} /> → wants to
              join {request.targetShipment.title ?? `shipment ${request.targetShipment.id.slice(0, 8)}`}
            </p>
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-sm"
              onClick={() => forceAccept.mutate(request.id)}
              disabled={forceAccept.isPending}
            >
              {forceAccept.isPending ? <ButtonSpinner /> : 'Force accept'}
            </button>
          </li>
        ))}
      </ul>
      {forceAccept.isError && <p className="error-text mt-2">Could not force-accept this request.</p>}
    </div>
  )
}
