import { useState } from 'react'
import { useSendCombineRequest } from '../api/combineRequests'
import { ButtonSpinner } from './Spinner'

export function CombineRequestModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [targetOrderId, setTargetOrderId] = useState('')
  const sendRequest = useSendCombineRequest()

  function submit() {
    const trimmed = targetOrderId.trim()
    if (!trimmed) return
    sendRequest.mutate(
      { requesterOrderId: orderId, targetOrderId: trimmed },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="card flex w-full max-w-sm flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-medium text-ink">Combine with another order</h2>
        <p className="text-sm text-ink/60">
          Paste the other member's order id (they can find it next to their order's nickname). They'll get a
          request to accept before anything is combined.
        </p>
        <input
          className="field-input"
          value={targetOrderId}
          onChange={(e) => setTargetOrderId(e.target.value)}
          placeholder="Target order id"
          aria-label="Target order id"
          autoFocus
        />
        {sendRequest.isError && <p className="error-text">{sendRequest.error instanceof Error ? sendRequest.error.message : 'Could not send request.'}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={submit} disabled={sendRequest.isPending || !targetOrderId.trim()}>
            {sendRequest.isPending ? <ButtonSpinner /> : 'Send request'}
          </button>
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
