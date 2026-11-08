import { create } from 'zustand'
import { decodeJwt, isExpired, type JwtClaims } from '../lib/jwt'

const TOKEN_KEY = 'omiyage.token'

interface AuthState {
  token: string | null
  claims: JwtClaims | null
  sessionExpired: boolean
  login: (token: string) => void
  logout: () => void
  expireSession: () => void
}

function loadInitialState(): Pick<AuthState, 'token' | 'claims' | 'sessionExpired'> {
  const signedOut = { token: null, claims: null, sessionExpired: false }
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return signedOut
  try {
    const claims = decodeJwt(token)
    if (isExpired(claims)) {
      localStorage.removeItem(TOKEN_KEY)
      return { ...signedOut, sessionExpired: true }
    }
    return { token, claims, sessionExpired: false }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    return signedOut
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),
  login: (token: string) => {
    const claims = decodeJwt(token)
    if (isExpired(claims)) throw new Error('JWT is expired or has no exp claim')
    localStorage.setItem(TOKEN_KEY, token)
    set({ token, claims, sessionExpired: false })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, claims: null, sessionExpired: false })
  },
  expireSession: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, claims: null, sessionExpired: true })
  },
}))
