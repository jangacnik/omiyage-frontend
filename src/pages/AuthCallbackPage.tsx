import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMeishiExchange } from '../api/meishiSso'
import { ApiError } from '../lib/apiClient'
import { checkCallback } from '../lib/meishiSso'
import { useAuthStore } from '../store/authStore'
import { BrandMark } from '../components/BrandMark'
import { ButtonSpinner } from '../components/Spinner'

const MESSAGES = {
  denied: 'Sign-in with Meishi was cancelled or denied.',
  invalid: 'The sign-in response did not match this browser session. Please start again.',
  rejected: 'The sign-in link expired or was already used. Please try again.',
  frozen: 'This account is frozen and cannot sign in.',
  disabled: 'Sign-in with Meishi is turned off right now. Use your nickname and password instead.',
  throttled: 'Too many sign-in attempts. Wait a minute and try again.',
  failed: 'Could not complete sign-in with Meishi. Please try again.',
} as const

function failureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return MESSAGES.failed
  if (error.status === 401) return MESSAGES.rejected
  if (error.status === 403) return MESSAGES.frozen
  if (error.status === 404 || error.status === 503) return MESSAGES.disabled
  if (error.status === 429) return MESSAGES.throttled
  return MESSAGES.failed
}

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const exchange = useMeishiExchange()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const check = checkCallback(params)
    // The authorization code must not stay in the address bar or the history.
    navigate('/auth/callback', { replace: true })
    if (!check.ok) {
      setError(MESSAGES[check.reason])
      return
    }
    exchange.mutate(
      { code: check.code, verifier: check.verifier },
      {
        onSuccess: ({ token }) => {
          try {
            login(token)
            navigate('/', { replace: true })
          } catch {
            setError(MESSAGES.failed)
          }
        },
        onError: (e) => setError(failureMessage(e)),
      },
    )
  }, [params, navigate, login, exchange])

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="card flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <BrandMark size={44} />
        {error ? (
          <>
            <p role="alert" className="error-text">{error}</p>
            <Link to="/login" className="btn-secondary w-full">Back to sign in</Link>
          </>
        ) : (
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <ButtonSpinner /> Signing you in
          </p>
        )}
      </div>
    </div>
  )
}
