const PENDING_KEY = 'omiyage.meishiSso'

interface PendingLogin {
  state: string
  verifier: string
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)))
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

export function callbackUri(): string {
  return `${window.location.origin}/auth/callback`
}

/** Builds the Meishi hosted-login URL (authorization code with PKCE) and keeps state and verifier for the callback. */
export async function buildAuthorizeUrl(authorizeUrl: string, clientId: string): Promise<string> {
  const pending: PendingLogin = { state: randomString(), verifier: randomString() }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUri(),
    state: pending.state,
    code_challenge: await challengeFor(pending.verifier),
    code_challenge_method: 'S256',
  })
  return `${authorizeUrl}?${params}`
}

export type CallbackCheck =
  | { ok: true; code: string; verifier: string }
  | { ok: false; reason: 'denied' | 'invalid' }

/** Checks the redirect from Meishi against the pending login. The pending login is single use, even when the check fails. */
export function checkCallback(params: URLSearchParams): CallbackCheck {
  const raw = sessionStorage.getItem(PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)
  if (params.get('error')) return { ok: false, reason: 'denied' }
  const pending = parsePending(raw)
  const code = params.get('code')
  if (!pending || !code || params.get('state') !== pending.state) return { ok: false, reason: 'invalid' }
  return { ok: true, code, verifier: pending.verifier }
}

function parsePending(raw: string | null): PendingLogin | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return typeof value?.state === 'string' && typeof value?.verifier === 'string' ? value : null
  } catch {
    return null
  }
}
