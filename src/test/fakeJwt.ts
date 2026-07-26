import type { Role } from '../types/api'

function base64url(json: unknown): string {
  return btoa(JSON.stringify(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function makeFakeToken(claims: { sub: string; nickname: string; role: Role; exp: number }): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' })
  const payload = base64url(claims)
  return `${header}.${payload}.fake-signature`
}
