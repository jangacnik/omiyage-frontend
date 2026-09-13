import { Link, useParams } from 'react-router-dom'
import { useInventoryItem } from '../api/inventory'
import { Spinner } from '../components/Spinner'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { formatMoney } from '../lib/currency'

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading, isError } = useInventoryItem(id)

  if (isLoading) return <Spinner fullPage label="Fetching item" />
  if (isError || !item) return <p className="error-text">Item not found.</p>

  return (
    <div className="card flex flex-col gap-4 md:flex-row">
      {item.images.length > 0 && (
        <div className="flex gap-3 overflow-x-auto md:w-1/2">
          {item.images.map((key) => (
            <ThumbnailImage key={key} imageKey={key} alt={item.title} className="h-48 w-48 shrink-0 rounded-lg" />
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2">
        <h1 className="page-title">{item.title}</h1>
        {item.description && <p className="text-ink/70">{item.description}</p>}
        <p className="text-2xl font-semibold text-forest">{formatMoney(item.priceAmount, item.currency)}</p>
        <dl className="grid grid-cols-2 gap-y-1 text-sm text-ink/70">
          <dt className="font-medium text-ink/50">Condition</dt>
          <dd>{item.condition}</dd>
          <dt className="font-medium text-ink/50">In stock</dt>
          <dd>{item.stockQuantity}</dd>
          <dt className="font-medium text-ink/50">Categories</dt>
          <dd>{item.categories.map((c) => c.name).join(', ') || 'None'}</dd>
        </dl>
        <Link to={`/orders/new?inventoryItemId=${item.id}`} className="btn-primary mt-2 self-start">
          Request this item
        </Link>
      </div>
    </div>
  )
}
