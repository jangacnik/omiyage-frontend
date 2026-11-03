import type { Role } from '../types/api'

function base64url(json: unknown): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(json)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function makeFakeToken(claims: { sub: string; nickname: string; role: Role; exp: number }): string {
  return makeTokenWithPayload(claims)
}

export function makeTokenWithPayload(payload: unknown): string {
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.fake-signature`
}
