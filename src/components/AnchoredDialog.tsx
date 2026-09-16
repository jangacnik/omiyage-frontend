import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const VIEWPORT_MARGIN = 12
const GAP = 8

/** Captured once, at the moment a short dialog first mounts - `document.activeElement` is still
 *  the button that triggered it (nothing else has stolen focus yet in the same tick), so every
 *  call site gets a sensible anchor with zero changes to its own onClick handler. Falls back to
 *  screen-center (anchor null) if nothing was focused, e.g. a dialog opened programmatically. */
export function useTriggerAnchor(): DOMRect | null {
  const [anchor] = useState<DOMRect | null>(() => {
    const el = document.activeElement
    return el instanceof HTMLElement && el !== document.body ? el.getBoundingClientRect() : null
  })
  return anchor
}

/** Backdrop + panel for a short dialog (confirm, move-item, combine-request) that opens next to
 *  whatever was clicked instead of always dead-center - keeps the triggering row/card in view
 *  instead of forcing a jump to the middle of the screen. Not for tall multi-field forms: a click
 *  near the bottom of a long page leaves no room below to anchor into, so those stay centered
 *  (just render them without this wrapper, using the old inset-0/items-center pattern). */
export function AnchoredDialog({
  anchor,
  onClose,
  role = 'dialog',
  labelledBy,
  className = '',
  children,
}: {
  anchor: DOMRect | null
  onClose: () => void
  role?: 'dialog' | 'alertdialog'
  labelledBy: string
  className?: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>(anchor ? { position: 'fixed', visibility: 'hidden' } : {})

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel || !anchor) return

    function reposition() {
      const panel = panelRef.current
      if (!panel || !anchor) return
      const rect = panel.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let top = anchor.bottom + GAP
      // Flip above the trigger when there isn't room below.
      if (top + rect.height > viewportHeight - VIEWPORT_MARGIN) {
        top = anchor.top - rect.height - GAP
      }
      top = Math.min(Math.max(top, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, viewportHeight - rect.height - VIEWPORT_MARGIN))

      let left = anchor.left
      left = Math.min(left, viewportWidth - rect.width - VIEWPORT_MARGIN)
      left = Math.max(left, VIEWPORT_MARGIN)

      setStyle({ position: 'fixed', top, left, visibility: 'visible' })
    }

    reposition()
    // The initial measurement can go stale - an error message appearing after a failed submit, a
    // validation line, an extra list item - anything that grows the panel after this first layout
    // pass. Re-measure whenever the panel's own size actually changes, not just on mount.
    // ResizeObserver isn't implemented in jsdom (this stays a one-time layout there, which is fine
    // for tests - actual browsers all support it).
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(reposition)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [anchor])

  return (
    <div className="animate-fade fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`card animate-pop w-full max-w-sm ${anchor ? '' : 'fixed inset-4 m-auto h-fit max-h-[calc(100vh-2rem)] overflow-y-auto'} ${className}`}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
