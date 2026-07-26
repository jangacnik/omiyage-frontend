import type { Role } from '../types/api'

export interface JwtClaims {
  sub: string
  nickname: string
  role: Role
  exp: number
}

export function decodeJwt(token: string): JwtClaims {
  const payload = token.split('.')[1]
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(json) as JwtClaims
}

export function isExpired(claims: JwtClaims): boolean {
  return Date.now() >= claims.exp * 1000
}
