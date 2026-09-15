import type { ReactNode } from 'react'
import { ItemCardShell } from './ItemCardShell'
import { OrderItemStatusBadge } from './OrderItemStatusBadge'
import { PreorderBadge } from './PreorderBadge'
import { StatusPill } from './StatusPill'
import { ThumbnailImage } from './ThumbnailImage'
import { ExternalLinkIcon } from './icons'
import { formatMoney } from '../lib/currency'
import type { Currency, OrderItemDto } from '../types/api'

const CONDITION_LABELS: Record<'NEW' | 'USED', string> = { NEW: 'New', USED: 'Used' }

function priceLabel(unitPrice: number, currency: Currency, label: string, quantity: number) {
  const suffix = label ? ` ${label}` : ''
  return quantity > 1 ? (
    <>
      {formatMoney(unitPrice, currency)}
      {suffix} each · {formatMoney(unitPrice * quantity, currency)} total
    </>
  ) : (
    <>
      {formatMoney(unitPrice, currency)}
      {suffix}
    </>
  )
}

/** Thumbnail-left, info-right template for an order item - shared by the user's own order view
 *  and the admin order view so both show the same information in the same place. `children` is
 *  the context-specific action area (edit/remove for a user, price/weight/status for an admin). */
export function OrderItemCard({ item, children }: { item: OrderItemDto; children?: ReactNode }) {
  return (
    <ItemCardShell
      thumbnail={<ThumbnailImage imageKey={item.imageKey} className="h-20 w-20 shrink-0 rounded-lg" />}
      actions={children}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-ink">{item.title}</p>
        <OrderItemStatusBadge status={item.status} />
        {item.paid && <StatusPill tone="done" label="Paid" size="sm" />}
        {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate} />}
      </div>

      {item.description && <p className="mt-0.5 text-sm text-ink/60">{item.description}</p>}

      <p className="mt-1 text-sm text-ink/60">
        {item.condition && `${CONDITION_LABELS[item.condition]} · `}
        qty {item.quantity}
        {item.weight != null && ` · ${item.weight} g`}
      </p>

      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
        {item.maxPrice != null && (
          <span className="text-ink/60">Max you set: {priceLabel(item.maxPrice, item.currency, '', item.quantity)}</span>
        )}
        {item.soldPrice != null ? (
          <span className="font-medium text-forest">
            You pay: {priceLabel(item.soldPrice, item.soldPriceCurrency ?? item.currency, '', item.quantity)}
          </span>
        ) : (
          <span className="text-ink/40">Price not set yet</span>
        )}
      </p>

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-sm text-forest hover:underline"
        >
          View item <ExternalLinkIcon size={12} />
        </a>
      )}
    </ItemCardShell>
  )
}
