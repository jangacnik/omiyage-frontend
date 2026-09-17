import { useState, type ReactNode } from 'react'
import { AnchoredDialog, useTriggerAnchor } from './AnchoredDialog'
import { DialogCloseButton } from './DialogCloseButton'
import { ItemCardShell } from './ItemCardShell'
import { OrderItemStatusBadge } from './OrderItemStatusBadge'
import { PreorderBadge } from './PreorderBadge'
import { StatusPill } from './StatusPill'
import { ThumbnailImage } from './ThumbnailImage'
import { ExternalLinkIcon } from './icons'
import { formatMoney } from '../lib/currency'
import type { Currency, OrderItemDto } from '../types/api'

export const CONDITION_LABELS: Record<'NEW' | 'USED', string> = { NEW: 'New', USED: 'Used' }

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

/** Everything but the thumbnail - shared verbatim between the card's own body and its preview
 *  dialog so the two can never drift apart on what they show for the same item. `titleId` lets
 *  the dialog point its aria-labelledby at the title actually rendered here. */
function ItemDetails({ item, descriptionClassName = 'mt-0.5', titleId }: { item: OrderItemDto; descriptionClassName?: string; titleId?: string }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p id={titleId} className="font-medium text-ink">
          {item.title}
        </p>
        <OrderItemStatusBadge status={item.status} />
        {item.paid && <StatusPill tone="done" label="Paid" size="sm" />}
        {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate} />}
      </div>

      {item.description && <p className={`${descriptionClassName} text-sm text-ink/60`}>{item.description}</p>}

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
    </>
  )
}

/** Its own component so useTriggerAnchor's mount-time capture runs fresh every time the preview
 *  opens, anchored next to the thumbnail that was clicked instead of jumping to screen-center. */
function ItemPreviewPanel({ item, onClose }: { item: OrderItemDto; onClose: () => void }) {
  const anchor = useTriggerAnchor()

  return (
    <AnchoredDialog anchor={anchor} onClose={onClose} labelledBy="order-item-preview-title" className="relative">
      <DialogCloseButton onClose={onClose} />
      <ThumbnailImage imageKey={item.imageKey} alt={item.title} className="mb-3 aspect-square w-full rounded-lg" />
      <ItemDetails item={item} titleId="order-item-preview-title" descriptionClassName="mt-1" />
    </AnchoredDialog>
  )
}

/** Thumbnail-left, info-right template for an order item - shared by the user's own order view
 *  and the admin order view so both show the same information in the same place. `children` is
 *  the context-specific action area (edit/remove for a user, price/weight/status for an admin).
 *  Clicking the thumbnail opens a bigger preview of the image plus the same details, next to
 *  whatever was clicked - handy since the card's own thumbnail is small and this list can get long. */
export function OrderItemCard({ item, children }: { item: OrderItemDto; children?: ReactNode }) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <ItemCardShell
        thumbnail={
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            aria-label={`Preview ${item.title}`}
            className="block shrink-0"
          >
            <ThumbnailImage imageKey={item.imageKey} className="h-20 w-20 rounded-lg" />
          </button>
        }
        actions={children}
      >
        <ItemDetails item={item} />
      </ItemCardShell>
      {showPreview && <ItemPreviewPanel item={item} onClose={() => setShowPreview(false)} />}
    </>
  )
}
