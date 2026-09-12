import { createContext, useCallback, useContext, useRef, useState } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
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
      {options && (
        <div
          className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="card animate-pop w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="page-title mb-2 text-lg">
              {options.title ?? 'Are you sure?'}
            </h2>
            <p className="mb-4 text-sm text-ink/70">{options.message}</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => close(false)}>
                {options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={options.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => close(true)}
                autoFocus
              >
                {options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
