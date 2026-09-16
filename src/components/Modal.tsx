import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/** Centered backdrop + panel, portaled to document.body. Every page's content sits inside
 *  Layout's `<main>`, which runs a settle-once CSS animation - Chrome keeps a completed
 *  animation's `transform` computed as an identity matrix rather than literally `none`, which
 *  makes `<main>` a containing block for any `position: fixed` descendant. A backdrop nested
 *  inside it would then cover only `<main>`'s own box (missing the nav bar and side gutters)
 *  instead of the full viewport. Rendering outside that DOM subtree via a portal sidesteps the
 *  problem regardless of what any ancestor's styling does, now or later. */
export function Modal({ onClose, className = '', children }: { onClose: () => void; className?: string; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={className}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
