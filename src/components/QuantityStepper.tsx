/** Shared +/- quantity control - the inventory card and item-detail dialog use this to pick how
 *  many of an item to add to the cart in one go, instead of only ever adding one at a time. */
export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
  label,
}: {
  quantity: number
  onChange: (quantity: number) => void
  min?: number
  label: string
}) {
  return (
    <div className="inline-flex h-11 shrink-0 items-center rounded-lg ring-1 ring-inset ring-mist" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
        className="flex h-full w-11 items-center justify-center text-muted transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30"
      >
        −
      </button>
      <span className="flex h-full min-w-8 items-center justify-center text-sm font-medium text-ink" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
        className="flex h-full w-11 items-center justify-center text-muted transition-colors hover:bg-mist"
      >
        +
      </button>
    </div>
  )
}
