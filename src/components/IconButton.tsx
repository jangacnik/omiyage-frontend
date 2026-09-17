import type { ReactNode } from 'react'

const VARIANT_CLASS = {
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  primary: 'btn-primary',
} as const

/** Compact square icon-only button for repeated row/card-level actions (edit, delete, retry,
 *  rename, ...) - `label` doubles as both the accessible name and the hover tooltip, since the
 *  icon alone carries no text for either sighted or screen-reader users. Not for primary CTAs
 *  (submit, checkout, save-a-whole-form): those keep a text label, this is for the small repeated
 *  controls where an icon reads faster than a two-word button once you know what it does. */
export function IconButton({
  icon,
  label,
  onClick,
  type = 'button',
  variant = 'secondary',
  disabled,
  className = '',
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'secondary' | 'danger' | 'primary'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      className={`${VARIANT_CLASS[variant]} h-8 min-h-0 w-8 shrink-0 gap-0 p-0 ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  )
}
