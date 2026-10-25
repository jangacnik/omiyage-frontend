import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

/** Label-above, input-below, optional hint and error below that - the shared shape for every form
 *  field in the app. The control is wrapped in the <label> so it needs no generated id, while the
 *  hint and error sit outside it (so they don't fold into the accessible name) and are linked to
 *  a native control through aria-describedby; `error` also sets aria-invalid and is announced. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  const control =
    isValidElement(children) && typeof children.type === 'string'
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
        })
      : children

  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <label className="flex flex-col gap-1">
        <span className="field-label">{label}</span>
        {control}
      </label>
      {hint && (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      )}
      {error && (
        <p id={errorId} role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  )
}
