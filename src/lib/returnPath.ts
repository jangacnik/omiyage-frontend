export const RETURN_PARAM = 'redirect'

const AUTH_PATHS = ['/login', '/auth/callback']

// Backslashes, whitespace and control characters are treated as separators by some URL parsers.
const UNSAFE_CHARACTERS = /[\\\u0000-\u0020\u007f]/

/** Where to go after sign-in. Only same-origin paths are accepted, so a crafted `?redirect=` link
 *  cannot send a user to another site; anything else falls back to the home page. */
export function safeReturnPath(candidate: string | null | undefined): string {
  if (!candidate?.startsWith('/') || UNSAFE_CHARACTERS.test(candidate)) return '/'
  const url = parseUrl(candidate)
  if (!url || url.origin !== window.location.origin || AUTH_PATHS.includes(url.pathname)) return '/'
  // Dot segments are only resolved by the parser, so `/.//host` normalises to `//host`: judge the result, not the input.
  const path = url.pathname + url.search + url.hash
  return path.startsWith('//') ? '/' : path
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
