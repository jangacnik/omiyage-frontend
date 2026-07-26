import { Link, useParams } from 'react-router-dom'
import { useInventoryItem } from '../api/inventory'
import { mediaUrl } from '../lib/media'

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading, isError } = useInventoryItem(id)

  if (isLoading) return <p>Loading...</p>
  if (isError || !item) return <p>Item not found.</p>

  return (
    <div>
      <h1>{item.title}</h1>
      <div className="flex gap-4">
        {item.images.map((key) => (
          <img key={key} src={mediaUrl(key)} alt={item.title} className="w-48" />
        ))}
      </div>
      <p>{item.description}</p>
      <p>Condition: {item.condition}</p>
      <p>
        Price: {item.priceAmount} {item.currency}
      </p>
      <p>In stock: {item.stockQuantity}</p>
      <p>Categories: {item.categories.map((c) => c.name).join(', ') || 'None'}</p>
      <Link to={`/orders/new?inventoryItemId=${item.id}`}>Request this item</Link>
    </div>
  )
}
