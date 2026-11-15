export const RETURN_PARAM = 'redirect'

const AUTH_PATHS = ['/login', '/auth/callback']

/** Where to go after sign-in. Only same-origin paths are accepted, so a crafted `?redirect=` link
 *  cannot send a user to another site; anything else falls back to the home page. */
export function safeReturnPath(candidate: string | null | undefined): string {
  if (!candidate?.startsWith('/')) return '/'
  const url = parseUrl(candidate)
  if (!url || url.origin !== window.location.origin || AUTH_PATHS.includes(url.pathname)) return '/'
  return url.pathname + url.search + url.hash
}

function parseUrl(candidate: string): URL | null {
  try {
    return new URL(candidate, window.location.origin)
  } catch {
    return null
  }
}

export function loginPathFor(returnTo: string): string {
  return `/login?${new URLSearchParams({ [RETURN_PARAM]: returnTo })}`
}
