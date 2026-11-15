import { describe, expect, it } from 'vitest'
import { loginPathFor, safeReturnPath } from './returnPath'

describe('safeReturnPath', () => {
  it.each([
    ['/orders', '/orders'],
    ['/inventory/abc-123', '/inventory/abc-123'],
    ['/orders?status=open#top', '/orders?status=open#top'],
    ['/', '/'],
  ])('keeps the same-origin path %s', (candidate, expected) => {
    expect(safeReturnPath(candidate)).toBe(expected)
  })

  it.each([
    ['missing', null],
    ['undefined', undefined],
    ['empty', ''],
    ['an absolute url', 'https://evil.example/orders'],
    ['a protocol-relative url', '//evil.example/orders'],
    ['a backslash host', '/\\evil.example'],
    ['a tab-split protocol-relative url', '/\t/evil.example'],
    ['a javascript url', 'javascript:alert(1)'],
    ['a relative path without a leading slash', 'orders'],
    ['the login page', '/login'],
    ['the login page with a query', '/login?redirect=/orders'],
    ['the auth callback', '/auth/callback'],
  ])('falls back to the home page for %s', (_name, candidate) => {
    expect(safeReturnPath(candidate)).toBe('/')
  })
})

describe('loginPathFor', () => {
  it('encodes the requested location into the redirect parameter', () => {
    expect(loginPathFor('/orders?a=1&b=2#x')).toBe('/login?redirect=%2Forders%3Fa%3D1%26b%3D2%23x')
  })
})
