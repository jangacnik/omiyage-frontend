import { Navigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLogin } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { ApiError } from '../lib/apiClient'
import { BrandMark } from '../components/BrandMark'
import { ButtonSpinner } from '../components/Spinner'

const loginSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const token = useAuthStore((s) => s.token)
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (token) return <Navigate to="/" replace />

  function onSubmit(data: LoginForm) {
    login.mutate(data)
  }

  const errorMessage = login.isError
    ? login.error instanceof ApiError
      ? login.error.message
      : 'Could not reach the server. Please try again.'
    : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="animate-rise mb-6 flex flex-col items-center gap-2 text-center">
          <BrandMark size={44} />
          <h1 className="page-title">Omiyage</h1>
          <p className="text-sm text-ink/60">Sign in to browse and request souvenirs.</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="card animate-rise flex flex-col gap-4"
          style={{ animationDelay: '0.08s' }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="nickname" className="field-label">
              Nickname
            </label>
            <input id="nickname" className="field-input" autoComplete="username" {...register('nickname')} aria-label="Nickname" />
            {errors.nickname && <p className="error-text">{errors.nickname.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field-input"
              autoComplete="current-password"
              {...register('password')}
              aria-label="Password"
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

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
      </div>
    </div>
  )
}
