import { useCallback, useRef, useState } from 'react'
import { AnchoredDialog } from './AnchoredDialog'
import { useTriggerAnchor } from './useTriggerAnchor'
import { ConfirmContext, type ConfirmOptions } from './confirmContext'
import { TrashIcon } from './icons'

/** Its own component (not inlined in the provider) so useTriggerAnchor's mount-time capture runs
 *  fresh every time a confirm opens, anchored next to whatever button called confirm() - that
 *  button is still document.activeElement at this point, since nothing else has taken focus in
 *  the same synchronous click handler that called confirm(). */
function ConfirmPanel({ options, onClose }: { options: ConfirmOptions; onClose: (result: boolean) => void }) {
  const anchor = useTriggerAnchor()

  return (
    <AnchoredDialog anchor={anchor} onClose={() => onClose(false)} role="alertdialog" labelledBy="confirm-title">
      <h2 id="confirm-title" className="page-title mb-2 text-lg">
        {options.title ?? 'Are you sure?'}
      </h2>
      <p className="mb-4 text-sm text-ink/70">{options.message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => onClose(false)}>
          {options.cancelLabel ?? 'Cancel'}
        </button>
        <button
          type="button"
          className={options.danger ? 'btn-danger-solid' : 'btn-primary'}
          onClick={() => onClose(true)}
        >
          {options.danger && <TrashIcon size={14} />}
          {options.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </AnchoredDialog>
  )
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<(value: boolean) => void>(undefined)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  function close(result: boolean) {
    resolver.current?.(result)
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && <ConfirmPanel options={options} onClose={close} />}
    </ConfirmContext.Provider>
  )
}
