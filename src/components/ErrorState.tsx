import type { ReactNode } from 'react'

export function ErrorState({
  message,
  onRetry,
  isRetrying = false,
  children,
}: {
  message: string
  onRetry: () => void
  isRetrying?: boolean
  children?: ReactNode
}) {
  return (
    <div className="card relative flex flex-col items-center gap-2 py-12 text-center">
      {children}
      <p role="alert" className="error-text">
        {message}
      </p>
      <button type="button" className="btn-secondary mt-2" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  )
}
