import type { ReactNode } from 'react'

/** Label-above, input-below, optional hint-below-that - the shared shape for every form field in
 *  the app except search boxes (those stay label-less with just a placeholder). Wrapping the
 *  input in a <label> associates it without needing a generated id - but when `hint` is set, still
 *  pass the input its own `aria-label` matching the visible label text: the hint sits inside this
 *  same <label>, and its text would otherwise get folded into the input's accessible name too. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}
