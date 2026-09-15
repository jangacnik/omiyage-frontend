import { Link } from 'react-router-dom'
import { PreorderBadge } from './PreorderBadge'
import { StatusPill } from './StatusPill'
import { ThumbnailImage } from './ThumbnailImage'
import { formatMoney } from '../lib/currency'
import { TrashIcon } from './icons'
import { useCartStore } from '../store/cartStore'
import type { InventoryItem } from '../types/api'

/** Card-grid tile shared by the public inventory browse page and the admin inventory page.
 *  Edit/delete only render (on hover) when the caller passes them - i.e. for an admin viewer. */
export function InventoryCard({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem
  onEdit?: () => void
  onDelete?: () => void
}) {
  const addToCart = useCartStore((s) => s.addItem)

  return (
    <div className="card card-interactive group relative overflow-hidden p-0">
      <Link to={`/inventory/${item.id}`} className="block">
        <ThumbnailImage
          imageKey={item.images[0]}
          alt={item.title}
          className="aspect-square w-full"
          foregroundClassName="transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105"
        />
        <div className="p-3">
          <p className="truncate font-medium text-ink">{item.title}</p>
          {/* Fixed-height slot, rendered whether or not this item preorders - otherwise cards
              with and without a preorder badge end up different heights. */}
          <div className="mb-1 flex h-6 items-center">
            {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate} />}
          </div>
          <p className="truncate text-sm text-ink/60">
            {formatMoney(item.priceAmount, item.currency)}
            {/* profitEur is pre-converted server-side: priceAmount[EUR] - boughtPrice[JPY] can't
                be subtracted directly, they're different currencies. */}
            {item.profitEur != null && <> · profit {formatMoney(item.profitEur, 'EUR')}</>}
          </p>
        </div>
      </Link>

      {!onEdit && !onDelete && (
        <div className="px-3 pb-3">
          <button
            type="button"
            className="btn-secondary w-full text-xs"
            onClick={() =>
              addToCart({
                inventoryItemId: item.id,
                title: item.title,
                imageKey: item.images[0],
                priceAmount: item.priceAmount,
                currency: item.currency,
              })
            }
          >
            Add to cart
          </button>
        </div>
      )}

      <div className="absolute left-2 top-2">
        {item.stockQuantity > 0 ? (
          <StatusPill tone="idle" label={`${item.stockQuantity} in stock`} size="sm" />
        ) : (
          <StatusPill tone="early" label="Request only" size="sm" />
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {onEdit && (
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={onEdit}>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={onDelete} aria-label={`Delete ${item.title}`}>
              <TrashIcon size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
