import type { ReactNode } from 'react'

/** Titled group of fields inside a form - item forms use Basics / Pricing / Details in that order. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-mist pt-3 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="float-left mb-1 w-full text-xs font-semibold uppercase tracking-wide text-muted">{title}</legend>
      {children}
    </fieldset>
  )
}
