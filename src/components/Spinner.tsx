interface SpinnerProps {
  label?: string
  fullPage?: boolean
}

export function Spinner({ label = 'Loading', fullPage = false }: SpinnerProps) {
  const content = (
    <p className="py-10 text-center text-sm font-medium text-muted" role="status">
      {label}…
    </p>
  )

  if (!fullPage) return content
  return <div className="flex min-h-[50vh] items-center justify-center">{content}</div>
}

export function ButtonSpinner() {
  return (
    <span className="animate-pulse motion-reduce:animate-none" role="status" aria-label="Loading">
      …
    </span>
  )
}
