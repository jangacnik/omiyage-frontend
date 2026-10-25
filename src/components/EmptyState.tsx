import type { ReactNode } from 'react'

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {message && <p className="text-sm text-muted">{message}</p>}
      {action}
    </div>
  )
}
