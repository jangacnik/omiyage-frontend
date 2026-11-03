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

function loadInitialState(): Pick<AuthState, 'token' | 'claims'> {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return { token: null, claims: null }
  try {
    const claims = decodeJwt(token)
    if (isExpired(claims)) {
      localStorage.removeItem(TOKEN_KEY)
      return { token: null, claims: null }
    }
    return { token, claims }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    return { token: null, claims: null }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),
  sessionExpired: false,
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
