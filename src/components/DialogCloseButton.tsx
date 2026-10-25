import { CloseIcon } from './icons'

/** Small × in the corner of a read-only detail dialog (item/order/shipment) - these have no
 *  Cancel/Save pair of their own to double as a close affordance, unlike a form dialog, so they
 *  need an explicit one on top of backdrop-click-to-close. */
export function DialogCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-ink"
    >
      <CloseIcon size={16} />
    </button>
  )
}
