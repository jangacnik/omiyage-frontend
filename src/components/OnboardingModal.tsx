import { useState } from 'react'

const STORAGE_KEY = 'omiyage.onboarding.dismissed'

function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function OnboardingModal() {
  const [open, setOpen] = useState(() => !isDismissed())
  const [dontShowAgain, setDontShowAgain] = useState(true)

  if (!open) return null

  function close() {
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        // localStorage unavailable — modal just reappears next visit, not worth failing over
      }
    }
    setOpen(false)
  }

  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" role="presentation" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="card animate-pop w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="onboarding-title" className="page-title mb-3 text-lg">
          Welcome to Omiyage
        </h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm text-ink/80">
          <li>
            <strong className="text-ink">Browse the inventory</strong> for things already in stock, or start a{' '}
            <strong className="text-ink">new request</strong> for anything else you'd like brought back.
          </li>
          <li>
            Add a photo to a request so it's easy to tell exactly what you mean — paste one straight from your
            clipboard or choose a file.
          </li>
          <li>
            Track each item's status on your order — <em>requested → confirming → buying → bought → shipped</em>.
          </li>
          <li>You can edit a request's items yourself until it moves past "in progress".</li>
        </ul>
        <label className="mb-4 flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
          Don't show this again
        </label>
        <button type="button" className="btn-primary w-full" onClick={close}>
          Got it
        </button>
      </div>
    </div>
  )
}
