import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAddBasketToOrder, useBasket, useConfirmBasket, useRemoveBasketLine, useUpdateBasketLine } from '../api/basket'
import { useInventoryItem } from '../api/inventory'
import { orderDisplayName, useMyOrders } from '../api/orders'
import { ErrorState } from '../components/ErrorState'
import { Field } from '../components/Field'
import { IconButton } from '../components/IconButton'
import { QuantityStepper } from '../components/QuantityStepper'
import { ButtonSpinner, Spinner } from '../components/Spinner'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { TrashIcon } from '../components/icons'
import { ApiError, api, errorMessage } from '../lib/apiClient'
import { formatMoney } from '../lib/currency'
import { BASKET_RETENTION_DAYS } from '../lib/features'
import type { BasketLineDto, Currency, InventoryItem, OrderDto } from '../types/api'

function BasketLineRow({ line }: { line: BasketLineDto }) {
  const { data: item } = useInventoryItem(line.inventoryItemId ?? undefined)
  const updateLine = useUpdateBasketLine()
  const removeLine = useRemoveBasketLine()

  const title = item?.title ?? line.customTitle ?? 'Item'
  const unitPrice = item?.priceAmount ?? line.maxPrice
  const unitCurrency = item?.currency ?? line.currency

  // The API replaces the whole line on update, so everything but the quantity is sent back as is.
  function setQuantity(quantity: number) {
    updateLine.mutate({
      id: line.id,
      customTitle: line.customTitle ?? undefined,
      customDescription: line.customDescription ?? undefined,
      maxPrice: line.maxPrice ?? undefined,
      quantity,
    })
  }

  return (
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 sm:contents">
        <ThumbnailImage imageKey={item?.images[0]} alt={title} className="h-16 w-16 shrink-0 rounded-lg" />
        <div className="flex-1">
          <p className="font-medium text-ink">{title}</p>
          {unitPrice != null && (
            <p className="text-sm text-muted">
              {line.inventoryItemId ? '' : 'Max '}
              {formatMoney(unitPrice, unitCurrency)} each
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <QuantityStepper quantity={line.quantity} onChange={setQuantity} label={`Quantity for ${title}`} />
        {unitPrice != null && (
          <p className="w-24 text-right font-medium text-ink">{formatMoney(unitPrice * line.quantity, unitCurrency)}</p>
        )}
        <IconButton
          variant="danger"
          label={`Remove ${title} from basket`}
          onClick={() => removeLine.mutate(line.id)}
          disabled={removeLine.isPending}
          icon={<TrashIcon size={14} />}
        />
      </div>
      {(updateLine.isError || removeLine.isError) && (
        <p className="error-text sm:w-full">{errorMessage(updateLine.error ?? removeLine.error, 'Could not update the basket.')}</p>
      )}
    </div>
  )
}

/** Shares the ['inventory-item', id] cache with BasketLineRow, so this adds no extra requests. */
function useBasketTotals(lines: BasketLineDto[]): [Currency, number][] {
  const items = useQueries({
    queries: lines.map((line) => ({
      queryKey: ['inventory-item', line.inventoryItemId ?? undefined],
      queryFn: () => api.get<InventoryItem>(`/api/inventory/${line.inventoryItemId}`),
      enabled: line.inventoryItemId !== null,
    })),
  })
  const totals = new Map<Currency, number>()
  lines.forEach((line, index) => {
    const item = items[index].data as InventoryItem | undefined
    const unitPrice = item?.priceAmount ?? line.maxPrice
    if (unitPrice == null) return
    const currency = item?.currency ?? line.currency
    totals.set(currency, (totals.get(currency) ?? 0) + unitPrice * line.quantity)
  })
  return [...totals.entries()]
}

const NEW_ORDER = ''

function BasketSummary({ lines }: { lines: BasketLineDto[] }) {
  const navigate = useNavigate()
  const confirm = useConfirmBasket()
  const addToOrder = useAddBasketToOrder()
  const totals = useBasketTotals(lines)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  // Only the first page of the member's own orders - same accepted limitation as RequestCustomItemPage.
  const { data: myOrders } = useMyOrders(0)
  const openOrders = (myOrders?.content ?? []).filter((order) => order.open)
  const [targetOrderId, setTargetOrderId] = useState(NEW_ORDER)
  // The selected order may have closed since the list was fetched; fall back to a new order.
  const target = openOrders.some((order) => order.id === targetOrderId) ? targetOrderId : NEW_ORDER
  const mutation = target ? addToOrder : confirm
  const closedMeanwhile = addToOrder.error instanceof ApiError && addToOrder.error.status === 409

  function submit() {
    const onSuccess = (order: OrderDto) => navigate(`/orders/${order.id}`)
    if (target) addToOrder.mutate(target, { onSuccess })
    else confirm.mutate(undefined, { onSuccess })
  }

  return (
    <div className="mt-4 border-t border-mist pt-4">
      {openOrders.length > 0 && (
        <Field label="Add to" className="mb-4">
          <select value={target} onChange={(e) => setTargetOrderId(e.target.value)} className="field-input">
            <option value={NEW_ORDER}>New order</option>
            {openOrders.map((order) => (
              <option key={order.id} value={order.id}>
                Order {orderDisplayName(order)} ({order.items.length} item{order.items.length === 1 ? '' : 's'})
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-ink">
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {totals.length > 0 && `: ${totals.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ')}`}
          </p>
          <p className="text-sm text-muted">Custom requests are counted at their max price. Shipping is not included.</p>
          <p className="text-sm text-muted">Unconfirmed baskets are kept for {BASKET_RETENTION_DAYS} days.</p>
        </div>
        <button type="button" className="btn-primary px-6" disabled={mutation.isPending} onClick={submit}>
          {mutation.isPending ? (
            <>
              <ButtonSpinner /> {target ? 'Adding' : 'Confirming'}
            </>
          ) : target ? (
            'Add to order'
          ) : (
            'Confirm order'
          )}
        </button>
      </div>
      {mutation.isError && (
        <p className="error-text mt-2">
          {closedMeanwhile
            ? 'That order was closed in the meantime. Pick another order or start a new one - your basket is unchanged.'
            : errorMessage(mutation.error, 'Could not submit the basket. Your basket is unchanged.')}
        </p>
      )}
    </div>
  )
}

export function BasketPage() {
  const { data: lines, isLoading, isError, refetch, isRefetching } = useBasket()

  if (isLoading) return <Spinner fullPage label="Fetching basket" />
  if (isError || !lines) {
    return <ErrorState message="Could not load your basket." onRetry={() => refetch()} isRetrying={isRefetching} />
  }

  if (lines.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 py-12 text-center">
        <p className="font-medium text-ink">Your basket is empty</p>
        <Link to="/inventory" className="btn-primary mt-2">
          Browse inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-4">Your basket</h1>
      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <BasketLineRow key={line.id} line={line} />
        ))}
      </div>
      <BasketSummary lines={lines} />
    </div>
  )
}
