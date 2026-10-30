import type { ChangeEvent } from 'react'
import { StatusDot, type StatusTone } from './StatusPill'

export interface StatusSelectOption<T extends string> {
  value: T
  label: string
  tone: StatusTone
}

interface StatusSelectProps<T extends string> {
  value: T | ''
  options: StatusSelectOption<T>[]
  onChange: (value: T | '') => void
  ariaLabel: string
  emptyLabel?: string
  disabled?: boolean
  className?: string
}

/** Native select (best on mobile) with the current state's coloured dot, using the same tones as
 *  the status badges. Native options cannot be styled, so the dot only marks the selected one. */
export function StatusSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  emptyLabel,
  disabled,
  className = '',
}: StatusSelectProps<T>) {
  const current = options.find((o) => o.value === value)

  return (
    <div className={`relative ${className}`}>
      {current && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <StatusDot tone={current.tone} />
        </span>
      )}
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T | '')}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`field-input min-h-11 ${current ? 'pl-8' : ''}`}
      >
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
