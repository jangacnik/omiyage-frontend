import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useInventoryItem } from '../api/inventory'
import { useCreateOrder } from '../api/orders'
import { ButtonSpinner } from '../components/Spinner'
import { OrderItemBuilder, draftFromInventoryItem, type DraftItem } from '../components/OrderItemBuilder'

export function OrdersNewPage() {
  const [searchParams] = useSearchParams()
  const preselectedInventoryItemId = searchParams.get('inventoryItemId') ?? undefined
  const { data: preselectedItem } = useInventoryItem(preselectedInventoryItemId)

  const [items, setItems] = useState<DraftItem[]>([])
  const [prefilledAdded, setPrefilledAdded] = useState(false)
  const [nickname, setNickname] = useState('')
  const createOrder = useCreateOrder()
  const navigate = useNavigate()

  useEffect(() => {
    if (preselectedItem && !prefilledAdded) {
      setItems((current) => [...current, draftFromInventoryItem(preselectedItem)])
      setPrefilledAdded(true)
    }
  }, [preselectedItem, prefilledAdded])

  async function submit() {
    const order = await createOrder.mutateAsync({ items: items.map((draft) => draft.input), nickname: nickname.trim() || undefined })
    navigate(`/orders/${order.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-4">New request</h1>

      <input
        placeholder="Nickname for this order (optional)"
        className="field-input mb-4"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        aria-label="Order nickname"
      />

      <OrderItemBuilder
        items={items}
        onAdd={(item) => setItems((current) => [...current, item])}
        onRemove={(index) => setItems((current) => current.filter((_, i) => i !== index))}
      />

      <button
        type="button"
        className="btn-primary mt-4"
        disabled={items.length === 0 || createOrder.isPending}
        onClick={submit}
      >
        {createOrder.isPending ? (
          <>
            <ButtonSpinner /> Submitting
          </>
        ) : (
          'Submit request'
        )}
      </button>
      {createOrder.isError && <p className="error-text mt-2">Could not submit request.</p>}
    </div>
  )
}
