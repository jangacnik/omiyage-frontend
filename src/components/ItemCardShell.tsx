import type { ReactNode } from 'react'

/** Thumbnail-left, info-right layout shared by every "one item, full details" view in the app -
 *  order items (OrderItemCard) and, since inventory items carry a different shape (an array of
 *  images rather than one imageKey), this lower-level shell so both can look the same without
 *  forcing one type onto the other. */
export function ItemCardShell({
  thumbnail,
  children,
  actions,
}: {
  thumbnail: ReactNode
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {thumbnail}
      <div className="min-w-0 flex-1">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  )
}
