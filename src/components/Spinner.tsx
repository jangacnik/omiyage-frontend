interface SpinnerProps {
  label?: string
  fullPage?: boolean
}

const GIFTS = ['🎁', '🎀', '📦']

export function Spinner({ label = 'Loading', fullPage = false }: SpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-3 py-10 text-ink/50" role="status">
      <span className="flex gap-1 text-4xl">
        {GIFTS.map((gift, i) => (
          <span
            key={gift}
            className="animate-gift-bounce inline-block"
            style={{ animationDelay: `${i * 0.15}s` }}
            aria-hidden="true"
          >
            {gift}
          </span>
        ))}
      </span>
      <p className="text-sm font-medium">{label}…</p>
      <span className="sr-only">{label}</span>
    </div>
  )

  if (!fullPage) return content
  return <div className="flex min-h-[50vh] items-center justify-center">{content}</div>
}

export function ButtonSpinner() {
  return (
    <span className="inline-flex items-center gap-1" role="status" aria-label="Loading">
      <span className="animate-dot-bounce h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: '0s' }} />
      <span className="animate-dot-bounce h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: '0.15s' }} />
      <span className="animate-dot-bounce h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: '0.3s' }} />
    </span>
  )
}
