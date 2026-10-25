import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/** Native modal <dialog> portaled to document.body: Escape, focus trap, inert background and
 *  focus return come from the browser. Children are the panel(s); clicking the backdrop closes. */
export function Modal({
  onClose,
  labelledBy,
  label,
  role = 'dialog',
  children,
}: {
  onClose: () => void
  labelledBy?: string
  label?: string
  role?: 'dialog' | 'alertdialog'
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [trigger] = useState(() => document.activeElement)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [trigger])

  return createPortal(
    <dialog
      ref={dialogRef}
      role={role}
      aria-labelledby={labelledBy}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-0 hidden h-full max-h-none w-full max-w-none items-center justify-center bg-transparent p-4 text-ink backdrop:bg-ink/40 open:flex"
    >
      {children}
    </dialog>,
    document.body,
  )
}
