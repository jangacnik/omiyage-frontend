import { useQueries } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useBasket, useConfirmBasket, useRemoveBasketLine, useUpdateBasketLine } from '../api/basket'
import { useInventoryItem } from '../api/inventory'
import { ErrorState } from '../components/ErrorState'
import { IconButton } from '../components/IconButton'
import { QuantityStepper } from '../components/QuantityStepper'
import { ButtonSpinner, Spinner } from '../components/Spinner'
import { ThumbnailImage } from '../components/ThumbnailImage'
import { TrashIcon } from '../components/icons'
import { api, errorMessage } from '../lib/apiClient'
import { formatMoney } from '../lib/currency'
import { BASKET_RETENTION_DAYS } from '../lib/features'
import type { BasketLineDto, Currency, InventoryItem } from '../types/api'

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

function BasketSummary({ lines }: { lines: BasketLineDto[] }) {
  const navigate = useNavigate()
  const confirm = useConfirmBasket()
  const totals = useBasketTotals(lines)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)

  function submit() {
    confirm.mutate(undefined, { onSuccess: (order) => navigate(`/orders/${order.id}`) })
  }

  return (
    <div className="mt-4 border-t border-mist pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-ink">
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {totals.length > 0 && `: ${totals.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ')}`}
          </p>
          <p className="text-sm text-muted">Custom requests are counted at their max price. Shipping is not included.</p>
          <p className="text-sm text-muted">Unconfirmed baskets are kept for {BASKET_RETENTION_DAYS} days.</p>
        </div>
        <button type="button" className="btn-primary px-6" disabled={confirm.isPending} onClick={submit}>
          {confirm.isPending ? (
            <>
              <ButtonSpinner /> Confirming
            </>
          ) : (
            'Confirm order'
          )}
        </button>
      </div>
      {confirm.isError && (
        <p className="error-text mt-2">{errorMessage(confirm.error, 'Could not confirm the order. Your basket is unchanged.')}</p>
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
