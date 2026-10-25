import { describe, expect, it } from 'vitest'
import { decodeJwt } from './jwt'
import { makeFakeToken } from '../test/fakeJwt'

describe('decodeJwt', () => {
  it('round-trips a non-ASCII nickname', () => {
    const token = makeFakeToken({ sub: 'u1', nickname: 'たろう', role: 'USER', exp: 1 })
    expect(decodeJwt(token).nickname).toBe('たろう')
  })
})
