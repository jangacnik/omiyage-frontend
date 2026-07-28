import { useParams } from 'react-router-dom'
import { useOrder } from '../api/orders'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Spinner } from '../components/Spinner'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)

  if (isLoading) return <Spinner fullPage label="Fetching order" />
  if (isError || !order) return <p className="error-text">Order not found.</p>

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Order {order.id.slice(0, 8)}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.notes && <p className="text-slate-600">{order.notes}</p>}

      <ul className="flex flex-col gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-200 p-3">
            <p className="font-medium text-slate-900">{item.title}</p>
            <p className="text-sm text-slate-500">
              {item.currency} {item.maxPrice ?? '—'} max / {item.actualPrice ?? '—'} paid
            </p>
            <p className="text-sm text-slate-500">{item.purchased ? 'Purchased' : 'Not purchased yet'}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
