import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useInventoryItem } from '../api/inventory'
import { DialogCloseButton } from '../components/DialogCloseButton'
import { IconButton } from '../components/IconButton'
import { PreorderBadge } from '../components/PreorderBadge'
import { QuantityStepper } from '../components/QuantityStepper'
import { Spinner, ButtonSpinner } from '../components/Spinner'
import { StatusPill } from '../components/StatusPill'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { formatMoney } from '../lib/currency'
import { CheckIcon, RefreshIcon } from '../components/icons'
import { ApiError } from '../lib/apiClient'
import { cartItemFromInventoryItem, useAddToCartFeedback, useCartStore } from '../store/cartStore'

function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0)

  return (
    <div className="flex flex-col gap-2 md:w-1/2">
      <div className="relative">
        <ThumbnailImage imageKey={images[index]} alt={alt} className="h-80 w-full rounded-lg" />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink"
            >
              ›
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`shrink-0 rounded-lg ring-2 ${i === index ? 'ring-forest' : 'ring-transparent'}`}
            >
              <ThumbnailImage imageKey={key} alt="" className="h-16 w-16 rounded-lg" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Doubles as a routed page (`/inventory/:id`, id from the URL) and as dialog content (id passed
 *  directly, onClose given so a caller like InventoryCard can render it inside a Modal instead of
 *  navigating away). */
export function InventoryDetailPage({ id: idProp, onClose }: { id?: string; onClose?: () => void } = {}) {
  const params = useParams<{ id: string }>()
  const id = idProp ?? params.id
  const { data: item, isLoading, isError, error, refetch, isRefetching } = useInventoryItem(id)
  const addToCart = useCartStore((s) => s.addItem)
  const { justAdded, announce } = useAddToCartFeedback()
  const [quantity, setQuantity] = useState(1)

  if (isLoading) return <Spinner fullPage label="Fetching item" />
  // Check item presence before isError - once a page has loaded, a failed background refetch (a
  // Retry click, or react-query's own retry) must not blank out data that's still perfectly valid.
  if (!item) {
    if (isError && !(error instanceof ApiError && error.status === 404)) {
      return (
        <div className="card relative flex flex-col items-center gap-2 py-12 text-center">
          {onClose && <DialogCloseButton onClose={onClose} />}
          <p className="font-medium text-ink">Could not load this item</p>
          <p className="text-sm text-ink/55">Something went wrong reaching the server.</p>
          <IconButton
            className="mt-2"
            label={isRefetching ? 'Retrying…' : 'Retry'}
            onClick={() => refetch()}
            disabled={isRefetching}
            icon={isRefetching ? <ButtonSpinner /> : <RefreshIcon size={14} />}
          />
        </div>
      )
    }
    return (
      <div className="card relative flex flex-col items-center gap-1 py-12 text-center">
        {onClose && <DialogCloseButton onClose={onClose} />}
        <p className="font-medium text-ink">Item not found</p>
        <p className="text-sm text-ink/55">It may have been removed from the catalog.</p>
        {onClose ? (
          <button type="button" className="btn-secondary mt-2" onClick={onClose}>
            Close
          </button>
        ) : (
          <Link to="/inventory" className="btn-secondary mt-2">
            Back to inventory
          </Link>
        )}
      </div>
    )
  }

  function handleAddToCart() {
    if (!item) return
    addToCart(cartItemFromInventoryItem(item), quantity)
    announce()
    setQuantity(1)
  }

  return (
    <div
      className="card relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto md:flex-row"
    >
      {onClose && <DialogCloseButton onClose={onClose} />}
      {item.images.length > 0 && <ImageCarousel images={item.images} alt={item.title} />}
      <div className="flex flex-1 flex-col gap-2">
        <h1 id="inventory-detail-title" className="page-title">{item.title}</h1>
        {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate} />}
        {item.description && <p className="text-ink/70">{item.description}</p>}
        <p className="text-2xl font-semibold text-forest">{formatMoney(item.priceAmount, item.currency)}</p>
        <dl className="grid grid-cols-2 gap-y-1 text-sm text-ink/70">
          <dt className="font-medium text-ink/50">Condition</dt>
          <dd>{item.condition}</dd>
          <dt className="font-medium text-ink/50">In stock</dt>
          <dd className="flex items-center gap-2">
            {item.stockQuantity}
            {item.stockQuantity === 0 && <StatusPill tone="early" label="Request only" size="sm" />}
          </dd>
          <dt className="font-medium text-ink/50">Categories</dt>
          <dd>{item.categories.map((c) => c.name).join(', ') || 'None'}</dd>
          {item.tags.length > 0 && (
            <>
              <dt className="font-medium text-ink/50">Tags</dt>
              <dd>{item.tags.join(', ')}</dd>
            </>
          )}
        </dl>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <QuantityStepper quantity={quantity} onChange={setQuantity} label={`Quantity of ${item.title} to add`} />
          <button type="button" className="btn-primary self-start" onClick={handleAddToCart}>
            {justAdded ? (
              <>
                <CheckIcon size={14} /> Added to cart
              </>
            ) : (
              'Add to cart'
            )}
          </button>
          <Link to={`/inventory/${item.id}/request`} className="btn-secondary self-start">
            Request with different price or condition
          </Link>
          <span className="sr-only" role="status" aria-live="polite">
            {justAdded ? `${item.title} added to cart` : ''}
          </span>
        </div>
        <p className="text-xs text-ink/45">
          Add to cart to buy at the listed price. Use the other option to set your own max price, condition, or request a preorder date.
        </p>
      </div>
    </div>
  )
}
