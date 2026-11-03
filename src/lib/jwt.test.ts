import { describe, expect, it } from 'vitest'
import { decodeJwt, isExpired, type JwtClaims } from './jwt'
import { makeFakeToken, makeTokenWithPayload } from '../test/fakeJwt'

describe('decodeJwt', () => {
  it('round-trips a non-ASCII nickname', () => {
    const token = makeFakeToken({ sub: 'u1', nickname: 'たろう', role: 'USER', exp: 1 })
    expect(decodeJwt(token).nickname).toBe('たろう')
  })

  it.each([[5], [null], ['x'], [[]], [true]])('throws when the payload is %j', (payload) => {
    expect(() => decodeJwt(makeTokenWithPayload(payload))).toThrow('JWT payload is not an object')
  })
})

describe('isExpired', () => {
  it.each([[undefined], [null], ['4000000000'], [NaN], [Infinity]])('treats exp %j as expired', (exp) => {
    expect(isExpired({ sub: 'u', nickname: 'n', role: 'USER', exp } as unknown as JwtClaims)).toBe(true)
  })
})
