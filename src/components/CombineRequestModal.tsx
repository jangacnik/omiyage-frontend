import { useState } from 'react'
import { useBrowsableShipments, useSendCombineRequest } from '../api/combineRequests'
import { AnchoredDialog, useTriggerAnchor } from './AnchoredDialog'
import { errorMessage } from '../lib/apiClient'
import { formatGrams } from '../lib/currency'
import { ButtonSpinner, Spinner } from './Spinner'

export function CombineRequestModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const { data: shipments, isLoading } = useBrowsableShipments()
  const sendRequest = useSendCombineRequest()
  const anchor = useTriggerAnchor()

  function submit() {
    if (!selectedShipmentId) return
    sendRequest.mutate(
      { requesterOrderId: orderId, targetShipmentId: selectedShipmentId },
      { onSuccess: onClose },
    )
  }

  return (
    <AnchoredDialog anchor={anchor} onClose={onClose} labelledBy="combine-request-title" className="flex max-w-md flex-col gap-3">
      <h2 id="combine-request-title" className="font-medium text-ink">
        Combine with another member's shipment
      </h2>
      <p className="text-sm text-ink/60">
        Pick a shipment to ask to join. Its owner gets a request to accept before anything is combined.
      </p>

      {isLoading && <Spinner label="Fetching shipments" />}
      {shipments && shipments.length === 0 && (
        <p className="text-sm text-ink/50">No other shipments are open to combine with right now.</p>
      )}

      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {shipments?.map((shipment) => (
          <li key={shipment.id}>
            <button
              type="button"
              onClick={() => setSelectedShipmentId(shipment.id)}
              className={`flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-sm ${
                selectedShipmentId === shipment.id ? 'border-forest bg-mint/30' : 'border-mist hover:bg-mist'
              }`}
            >
              <span className="font-medium text-ink">{shipment.title ?? `Shipment ${shipment.id.slice(0, 8)}`}</span>
              <span className="text-ink/60">
                {shipment.ownerNickname ?? 'Unknown member'} · {shipment.itemCount} item(s) · {formatGrams(shipment.totalWeightGrams)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {sendRequest.isError && <p className="error-text">{errorMessage(sendRequest.error, 'Could not send request.')}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={submit} disabled={sendRequest.isPending || !selectedShipmentId}>
          {sendRequest.isPending ? <ButtonSpinner /> : 'Send request'}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onClose}>
          Cancel
        </button>
      </div>
    </AnchoredDialog>
  )
}
