import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PreorderBadge } from './PreorderBadge'
import { StatusPill } from './StatusPill'
import { ThumbnailImage } from './ThumbnailImage'
import { formatGrams, formatMoney } from '../lib/currency'
import { CartIcon, CheckIcon, EditIcon, TrashIcon } from './icons'
import { cartItemFromInventoryItem, useAddToCartFeedback, useCartStore } from '../store/cartStore'
import { Modal } from './Modal'
import { InventoryDetailPage } from '../pages/InventoryDetailPage'
import { IconButton } from './IconButton'
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
  const queryClient = useQueryClient()
  const canShop = !onEdit && !onDelete

  // The card already has the full item - prime the dialog's query so it renders instantly
  // instead of flashing a spinner for data that's already on screen.
  function openDetail() {
    queryClient.setQueryData(['inventory-item', item.id], item)
    setShowDetail(true)
  }

  function handleAddToCart() {
    addToCart(cartItemFromInventoryItem(item), quantity)
    announce()
    setQuantity(1)
  }

  return (
    <div className="card card-interactive group relative overflow-hidden p-0">
      <button type="button" onClick={openDetail} className="block w-full text-left">
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
            {item.weight != null && <> · {formatGrams(item.weight)}</>}
          </p>
        </div>
      </button>

      {canShop && (
        <div className="px-3 pb-3">
          <QuantityStepper quantity={quantity} onChange={setQuantity} label={`Quantity of ${item.title} to add`} />
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

      {/* Quick-add on the thumbnail itself - the only add-to-cart control on the card now, using
          whatever quantity the stepper below is set to (so the stepper isn't just decorative).
          Sits outside the card-opening button, not nested in it, so it doesn't need its own
          click-propagation handling - same trick the edit/delete overlay below already uses. */}
      {canShop && (
        <button
          type="button"
          onClick={handleAddToCart}
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
          {onEdit && <IconButton label={`Edit ${item.title}`} onClick={onEdit} icon={<EditIcon size={14} />} />}
          {onDelete && (
            <IconButton variant="danger" label={`Delete ${item.title}`} onClick={onDelete} icon={<TrashIcon size={14} />} />
          )}
        </div>
      )}

      {showDetail && (
        <Modal onClose={() => setShowDetail(false)} labelledBy="inventory-detail-title">
          <InventoryDetailPage id={item.id} onClose={() => setShowDetail(false)} />
        </Modal>
      )}
    </div>
  )
}
