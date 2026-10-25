import { useState } from 'react'

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
