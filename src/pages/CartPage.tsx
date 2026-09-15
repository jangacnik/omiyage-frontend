import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useCreateOrder } from '../api/orders'
import { ButtonSpinner } from '../components/Spinner'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { TrashIcon } from '../components/icons'
import { formatMoney } from '../lib/currency'

export function CartPage() {
  const items = useCartStore((s) => s.items)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const [nickname, setNickname] = useState('')
  const createOrder = useCreateOrder()
  const navigate = useNavigate()

  const total = items.reduce((sum, item) => sum + item.priceAmount * item.quantity, 0)
  // priceAmount is always EUR (InventoryService forces it server-side, see
  // OrderService.buildOrderItem's soldPrice stamp for the order-item equivalent) - falling back to
  // 'EUR' only matters for an empty cart, which never reaches this branch.
  const totalCurrency = items[0]?.currency ?? 'EUR'

  async function submit() {
    try {
      const order = await createOrder.mutateAsync({
        nickname: nickname.trim() || undefined,
        items: items.map((item) => ({ inventoryItemId: item.inventoryItemId, currency: item.currency, quantity: item.quantity })),
      })
      clear()
      navigate(`/orders/${order.id}`)
    } catch {
      // createOrder.isError renders the message below - stay on the page so the user can retry.
    }
  }

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 py-12 text-center">
        <p className="font-medium text-ink">Your cart is empty</p>
        <Link to="/inventory" className="btn-primary mt-2">
          Browse inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-4">Your cart</h1>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.inventoryItemId} className="card flex items-center gap-3">
            <ThumbnailImage imageKey={item.imageKey} alt={item.title} className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="flex-1">
              <p className="font-medium text-ink">{item.title}</p>
              <p className="text-sm text-ink/60">{formatMoney(item.priceAmount, item.currency)} each</p>
            </div>
            <input
              type="number"
              min={1}
              step={1}
              value={item.quantity}
              onChange={(e) => {
                const parsed = Math.floor(Number(e.target.value))
                setQuantity(item.inventoryItemId, Number.isFinite(parsed) ? Math.max(1, parsed) : 1)
              }}
              aria-label={`Quantity for ${item.title}`}
              className="field-input w-16 text-center"
            />
            <p className="w-20 text-right font-medium text-ink">
              {formatMoney(item.priceAmount * item.quantity, item.currency)}
            </p>
            <button
              type="button"
              className="btn-danger px-2 py-1 text-xs"
              onClick={() => removeItem(item.inventoryItemId)}
              aria-label={`Remove ${item.title} from cart`}
            >
              <TrashIcon size={13} />
            </button>
          </div>
        ))}
      </div>

      <input
        placeholder="Nickname for this order (optional)"
        className="field-input mt-4"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        aria-label="Order nickname"
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-lg font-semibold text-ink">Total: {formatMoney(total, totalCurrency)}</p>
        <button type="button" className="btn-primary" disabled={createOrder.isPending} onClick={submit}>
          {createOrder.isPending ? (
            <>
              <ButtonSpinner /> Submitting
            </>
          ) : (
            'Submit order'
          )}
        </button>
      </div>
      {createOrder.isError && <p className="error-text mt-2">Could not submit order.</p>}
    </div>
  )
}
