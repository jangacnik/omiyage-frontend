import { Navigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLogin } from '../api/auth'
import { useMeishiSsoConfig } from '../api/meishiSso'
import { buildAuthorizeUrl } from '../lib/meishiSso'
import { useAuthStore } from '../store/authStore'
import { ApiError } from '../lib/apiClient'
import { Field } from '../components/Field'
import { BrandMark } from '../components/BrandMark'
import { ButtonSpinner } from '../components/Spinner'

const loginSchema = z.object({
  nickname: z.string().min(1, 'Enter your nickname'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginForm = z.infer<typeof loginSchema>

/** One message per failure kind. MeishiApi answers the same 401 for a wrong password, an unknown
 *  nickname and a locked account on purpose, so the page must not tell them apart either. */
function loginErrorMessage(error: Error): string {
  if (!(error instanceof ApiError)) return 'Could not reach the server. Check your connection and try again.'
  if (error.status === 403) return 'This account is frozen. Ask an admin to reactivate it.'
  if (error.status === 429) return 'Too many sign-in attempts. Wait a few minutes, then try again.'
  if (error.status >= 500) return 'The server ran into a problem. Please try again in a moment.'
  return 'Nickname or password is incorrect. After several failed tries the account is locked for a while.'
}

export function LoginPage() {
  const token = useAuthStore((s) => s.token)
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const login = useLogin()
  const sso = useMeishiSsoConfig()
  const [ssoStatus, setSsoStatus] = useState<'idle' | 'redirecting' | 'failed'>('idle')
  const errorRef = useRef<HTMLParagraphElement>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const errorMessage = login.error ? loginErrorMessage(login.error) : null

  useEffect(() => {
    if (login.error) errorRef.current?.focus()
  }, [login.error])

  if (token) return <Navigate to="/" replace />

  function onSubmit(data: LoginForm) {
    login.mutate(data)
  }

  async function continueWithMeishi() {
    if (!sso || ssoStatus === 'redirecting') return
    setSsoStatus('redirecting')
    try {
      window.location.assign(await buildAuthorizeUrl(sso.authorizeUrl, sso.clientId))
    } catch {
      setSsoStatus('failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandMark size={44} />
          <h1 className="page-title">Omiyage</h1>
          <p className="text-sm text-muted">Sign in to browse and request souvenirs.</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="card flex flex-col gap-4"
        >
          <Field label="Nickname" error={errors.nickname?.message}>
            <input className="field-input" autoComplete="username" {...register('nickname')} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input type="password" className="field-input" autoComplete="current-password" {...register('password')} />
          </Field>

          {sessionExpired && !errorMessage && <p role="alert" className="error-text">Session expired, please sign in again.</p>}
          {errorMessage && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="error-text">
              {errorMessage}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <ButtonSpinner /> Signing in
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {sso && (
          <>
            {ssoStatus === 'failed' && (
              <p role="alert" className="error-text mt-4">Could not start sign-in with Meishi. Please try again.</p>
            )}
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              disabled={ssoStatus === 'redirecting'}
              onClick={continueWithMeishi}
            >
              Continue with Meishi
            </button>
          </>
        )}
      </div>
    </div>
  )
}
