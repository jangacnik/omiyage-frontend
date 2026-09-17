import { useState } from 'react'
import { PreorderBadge } from './PreorderBadge'
import { StatusPill } from './StatusPill'
import { ThumbnailImage } from './ThumbnailImage'
import { formatMoney } from '../lib/currency'
import { CartIcon, CheckIcon, TrashIcon } from './icons'
import { cartItemFromInventoryItem, useAddToCartFeedback, useCartStore } from '../store/cartStore'
import { Modal } from './Modal'
import { InventoryDetailPage } from '../pages/InventoryDetailPage'
import { QuantityStepper } from './QuantityStepper'
import type { InventoryItem } from '../types/api'

/** Card-grid tile shared by the public inventory browse page and the admin inventory page.
 *  Edit/delete only render (on hover) when the caller passes them - i.e. for an admin viewer.
 *  Clicking the card itself opens the item's details in a dialog rather than navigating away -
 *  self-contained here so neither caller needs any state of its own for that. */
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
  const { justAdded, announce } = useAddToCartFeedback()
  const [quantity, setQuantity] = useState(1)
  const [showDetail, setShowDetail] = useState(false)
  const canShop = !onEdit && !onDelete

  function handleAddToCart() {
    addToCart(cartItemFromInventoryItem(item), quantity)
    announce()
    setQuantity(1)
  }

  return (
    <div className="card card-interactive group relative overflow-hidden p-0">
      <button type="button" onClick={() => setShowDetail(true)} className="block w-full text-left">
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
      </button>

      {canShop && (
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          <QuantityStepper quantity={quantity} onChange={setQuantity} label={`Quantity of ${item.title} to add`} />
          <button type="button" className="btn-primary w-full text-sm" onClick={handleAddToCart}>
            {justAdded ? (
              <>
                <CheckIcon size={14} /> Added
              </>
            ) : (
              'Add to cart'
            )}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {justAdded ? `${item.title} added to cart` : ''}
          </span>
        </div>
      )}

      <div className="absolute left-2 top-2">
        {item.stockQuantity > 0 ? (
          <StatusPill tone="idle" label={`${item.stockQuantity} in stock`} size="sm" />
        ) : (
          <StatusPill tone="early" label="Request only" size="sm" />
        )}
      </div>

      {/* Quick-add on the thumbnail itself - the full-width button below still exists for anyone
          who wants to see the label, but this one-click shortcut means never having to look past
          the image while browsing. Always adds just one, regardless of the stepper above - the
          stepper's count is for a deliberate bulk add. Sits outside the card-opening button, not
          nested in it, so it doesn't need its own click-propagation handling - same trick the
          edit/delete overlay below already uses. */}
      {canShop && (
        <button
          type="button"
          onClick={() => {
            addToCart(cartItemFromInventoryItem(item))
            announce()
          }}
          aria-label={justAdded ? `${item.title} added to cart` : `Add ${item.title} to cart`}
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
            justAdded ? 'bg-forest text-paper' : 'bg-ink/70 text-paper hover:bg-ink'
          }`}
        >
          {justAdded ? <CheckIcon size={16} /> : <CartIcon size={16} />}
        </button>
      )}

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

      {showDetail && (
        <Modal onClose={() => setShowDetail(false)}>
          <InventoryDetailPage id={item.id} onClose={() => setShowDetail(false)} />
        </Modal>
      )}
    </div>
  )
}
