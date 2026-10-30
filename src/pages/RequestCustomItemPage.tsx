import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAddBasketLine } from '../api/basket'
import { useInventoryItem } from '../api/inventory'
import { BASKET_ENABLED } from '../lib/features'
import { orderDisplayName, useAddMyOrderItem, useCreateOrder, useMyOrders } from '../api/orders'
import { CustomItemForm } from '../components/OrderItemBuilder'
import type { DraftItem } from '../lib/orderItemDrafts'
import { Field } from '../components/Field'
import { Spinner } from '../components/Spinner'
import { errorMessage } from '../lib/apiClient'

const NEW_ORDER = ''

/** "Request with different price or condition" from an inventory listing - unlike Add to cart
 *  (which charges the listed price with no room to negotiate), this starts a real custom request
 *  pre-filled from the listing, letting the member set their own condition/max price/quantity and
 *  land it on any of their still-open orders instead of always spinning up a new one. */
export function RequestCustomItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading } = useInventoryItem(id)
  // Only the first page of the member's own orders - same accepted limitation as elsewhere in the
  // app (e.g. AdminOrdersPage's cross-page merge check) for someone with an unusually long history.
  const { data: myOrders } = useMyOrders(0)
  const openOrders = (myOrders?.content ?? []).filter((order) => order.open)

  const [targetOrderId, setTargetOrderId] = useState(NEW_ORDER)
  const [nickname, setNickname] = useState('')
  const createOrder = useCreateOrder()
  const addItem = useAddMyOrderItem()
  const addBasketLine = useAddBasketLine()

  if (isLoading) return <Spinner fullPage label="Fetching item" />
  if (!item) return <p className="error-text">Item not found.</p>

  // Left to reject (not caught here) - CustomItemForm awaits this and only clears the member's
  // edits once it resolves, so a failed submission keeps what they typed instead of reverting to
  // the listing's defaults. The error itself still renders below via isError regardless.
  async function submit(draft: DraftItem) {
    if (BASKET_ENABLED) {
      // The basket keeps title, description, currency, max price and quantity only - condition,
      // link and image from the form are not carried over yet.
      await addBasketLine.mutateAsync({
        customTitle: draft.input.title,
        customDescription: draft.input.description,
        currency: draft.input.currency,
        maxPrice: draft.input.maxPrice,
        quantity: draft.input.quantity,
      })
      navigate('/basket')
      return
    }
    const order = targetOrderId
      ? await addItem.mutateAsync({ orderId: targetOrderId, ...draft.input })
      : await createOrder.mutateAsync({ items: [draft.input], nickname: nickname.trim() || undefined })
    navigate(`/orders/${order.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title mb-1">Request &quot;{item.title}&quot;</h1>
      <p className="mb-4 text-sm text-muted">
        Set your own condition, max price, or quantity for this item - unlike Add to cart, which always charges the listed price.
      </p>

      {!BASKET_ENABLED && (
        <Field label="Add to" hint={openOrders.length === 0 ? "You don't have any open orders yet, so this starts a new one" : undefined} className="mb-4">
          <select value={targetOrderId} onChange={(e) => setTargetOrderId(e.target.value)} className="field-input">
            <option value={NEW_ORDER}>New order</option>
            {openOrders.map((order) => (
              <option key={order.id} value={order.id}>
                Order {orderDisplayName(order)} ({order.items.length} item{order.items.length === 1 ? '' : 's'})
              </option>
            ))}
          </select>
        </Field>
      )}

      {!BASKET_ENABLED && !targetOrderId && (
        <Field label="Order name" hint="Optional - a name to tell this order apart from your others" className="mb-4">
          <input className="field-input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </Field>
      )}

      <CustomItemForm
        onAdd={submit}
        submitLabel={BASKET_ENABLED ? 'Add to basket' : targetOrderId ? 'Add to order' : 'Submit request'}
        defaultValues={{
          title: item.title,
          description: item.description ?? undefined,
          link: item.link ?? undefined,
          condition: item.condition,
          maxPrice: item.priceAmount.toString(),
          imageKey: item.images[0],
        }}
      />
      {(createOrder.isError || addItem.isError || addBasketLine.isError) && (
        <p className="error-text mt-2">
          {errorMessage(createOrder.error ?? addItem.error ?? addBasketLine.error, 'Could not submit this request.')}
        </p>
      )}
    </div>
  )
}
