import { BASE_URL } from '../lib/apiClient'

/** Square icon for an order: the first item's image, or an empty placeholder box when it has none. */
export function OrderIcon({ iconUrl }: { iconUrl?: string | null }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-mist" data-testid="order-icon">
      {iconUrl && <img src={`${BASE_URL}${iconUrl}`} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />}
    </div>
  )
}
