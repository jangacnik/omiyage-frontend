import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateOrder } from '../api/orders'
import { errorMessage } from '../lib/apiClient'
import { ButtonSpinner } from '../components/Spinner'
import { OrderItemBuilder } from '../components/OrderItemBuilder'
import type { DraftItem } from '../lib/orderItemDrafts'
import { Field } from '../components/Field'

export function OrdersNewPage() {
  const [items, setItems] = useState<DraftItem[]>([])
  const [nickname, setNickname] = useState('')
  const createOrder = useCreateOrder()
  const navigate = useNavigate()

  async function submit() {
    try {
      const order = await createOrder.mutateAsync({ items: items.map((draft) => draft.input), nickname: nickname.trim() || undefined })
      navigate(`/orders/${order.id}`)
    } catch {
      // createOrder.isError renders the message below - stay on the page so the user can retry.
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-4">New request</h1>

      <Field label="Order name" hint="Optional - a name to tell this order apart from your others" className="mb-4">
        <input className="field-input" value={nickname} onChange={(e) => setNickname(e.target.value)} aria-label="Order name" />
      </Field>

      <OrderItemBuilder
        items={items}
        onAdd={(item) => setItems((current) => [...current, item])}
        onRemove={(index) => setItems((current) => current.filter((_, i) => i !== index))}
        onUpdateQuantity={(index, quantity) =>
          setItems((current) => current.map((item, i) => (i === index ? { ...item, input: { ...item.input, quantity } } : item)))
        }
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
      {createOrder.isError && (
        <p className="error-text mt-2">
          {errorMessage(createOrder.error, 'Could not submit request. Please try again.')}
        </p>
      )}
    </div>
  )
}
