import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useCreateOrder } from '../api/orders'
import { Field } from '../components/Field'
import { PreorderBadge } from '../components/PreorderBadge'
import { ButtonSpinner } from '../components/Spinner'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { TrashIcon } from '../components/icons'
import { errorMessage } from '../lib/apiClient'
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
          <div key={item.inventoryItemId} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* sm:contents un-nests these two on wider screens, so ThumbnailImage and the
                title/price block become independent flex items in the row alongside the qty
                controls below, instead of needing a second copy of this block for each layout. */}
            <div className="flex items-center gap-3 sm:contents">
              <ThumbnailImage imageKey={item.imageKey} alt={item.title} className="h-16 w-16 shrink-0 rounded-lg" />
              <div className="flex-1">
                <p className="flex items-center gap-2 font-medium text-ink">
                  {item.title}
                  {item.isPreorder && <PreorderBadge expectedReleaseDate={item.expectedReleaseDate ?? null} />}
                </p>
                <p className="text-sm text-ink/60">{formatMoney(item.priceAmount, item.currency)} each</p>
                {item.stockQuantity != null && item.quantity > item.stockQuantity && (
                  <p className="text-xs text-ink/45">
                    Only {item.stockQuantity} in stock - the rest will be requested for you
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Field label="Qty" className="w-20">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={item.quantity}
                  onChange={(e) => {
                    // Don't clamp an empty field back to 1 immediately - see the identical note on
                    // OrderItemBuilder's quantity input.
                    if (e.target.value === '') return
                    const parsed = Math.floor(Number(e.target.value))
                    if (Number.isFinite(parsed)) setQuantity(item.inventoryItemId, Math.max(1, parsed))
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') setQuantity(item.inventoryItemId, 1)
                  }}
                  aria-label={`Quantity for ${item.title}`}
                  className="field-input text-center"
                />
              </Field>
              <p className="w-24 text-right font-medium text-ink">
                {formatMoney(item.priceAmount * item.quantity, item.currency)}
              </p>
              <button
                type="button"
                className="btn-danger px-3 text-sm"
                onClick={() => removeItem(item.inventoryItemId)}
                aria-label={`Remove ${item.title} from cart`}
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Field label="Order nickname" hint="Optional - helps tell this order apart from others" className="mt-4">
        <input className="field-input" value={nickname} onChange={(e) => setNickname(e.target.value)} aria-label="Order nickname" />
      </Field>

      <div className="mt-4 flex items-center justify-between border-t border-mist pt-4">
        <p className="text-lg font-semibold text-ink">Total: {formatMoney(total, totalCurrency)}</p>
        <button type="button" className="btn-primary px-6" disabled={createOrder.isPending} onClick={submit}>
          {createOrder.isPending ? (
            <>
              <ButtonSpinner /> Submitting
            </>
          ) : (
            'Submit order'
          )}
        </button>
      </div>
      {createOrder.isError && (
        <p className="error-text mt-2">
          {errorMessage(createOrder.error, 'Could not submit order. Please try again.')}
        </p>
      )}
    </div>
  )
}
