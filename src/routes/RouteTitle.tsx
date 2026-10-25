import { useEffect } from 'react'
import { Outlet, useMatches } from 'react-router-dom'

const APP_NAME = 'Omiyage'

export function RouteTitle() {
  const title = useMatches()
    .map((match) => (match.handle as { title?: string } | undefined)?.title)
    .findLast(Boolean)

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])

  return <Outlet />
}
