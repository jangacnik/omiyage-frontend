import { useParams } from 'react-router-dom'
import { useOrder } from '../api/orders'
import { OrderStatusBadge } from '../components/OrderStatusBadge'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)

  if (isLoading) return <p>Loading...</p>
  if (isError || !order) return <p>Order not found.</p>

  return (
    <div>
      <h1>Order {order.id.slice(0, 8)}</h1>
      <OrderStatusBadge status={order.status} />
      {order.notes && <p>{order.notes}</p>}

      <ul>
        {order.items.map((item) => (
          <li key={item.id}>
            <p>{item.title}</p>
            <p>
              {item.currency} {item.maxPrice ?? '—'} max / {item.actualPrice ?? '—'} paid
            </p>
            <p>{item.purchased ? 'Purchased' : 'Not purchased yet'}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
