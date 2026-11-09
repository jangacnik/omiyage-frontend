import type { ReactNode } from 'react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'

function StatusPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="card flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <BrandMark size={44} />
        <h1 className="page-title">{title}</h1>
        {children}
      </div>
    </main>
  )
}

const homeLink = (
  <Link to="/" className="btn-primary w-full">
    Go to the start page
  </Link>
)

export function NotFoundPage() {
  return (
    <StatusPage title="Page not found">
      <p className="text-sm text-muted">The page you were looking for does not exist or has moved.</p>
      {homeLink}
    </StatusPage>
  )
}

/** Root error boundary: friendly text only, never the error message or stack. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  console.error('route error', error)
  return (
    <StatusPage title="Something went wrong">
      <p className="text-sm text-muted">Please try again. If it keeps happening, tell an admin.</p>
      <button type="button" className="btn-secondary w-full" onClick={() => window.location.reload()}>
        Reload
      </button>
      {homeLink}
    </StatusPage>
  )
}
