import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useInventoryItem } from '../api/inventory'
import { PreorderBadge } from '../components/PreorderBadge'
import { Spinner } from '../components/Spinner'
import { StatusPill } from '../components/StatusPill'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { formatMoney } from '../lib/currency'
import { useCartStore } from '../store/cartStore'

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
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink"
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

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading, isError } = useInventoryItem(id)
  const addToCart = useCartStore((s) => s.addItem)

  if (isLoading) return <Spinner fullPage label="Fetching item" />
  if (isError || !item) return <p className="error-text">Item not found.</p>

  return (
    <div className="card flex flex-col gap-4 md:flex-row">
      {item.images.length > 0 && <ImageCarousel images={item.images} alt={item.title} />}
      <div className="flex flex-1 flex-col gap-2">
        <h1 className="page-title">{item.title}</h1>
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
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn-primary self-start"
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
          <Link to={`/orders/new?inventoryItemId=${item.id}`} className="btn-secondary self-start">
            Request this item
          </Link>
        </div>
      </div>
    </div>
  )
}
