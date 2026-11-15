import { describe, expect } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { loginPathFor, safeReturnPath } from './returnPath'

const isOrdinary = (path: string) => !path.startsWith('//') && !/^\/(login|auth\/callback)(\/|$|\?|#)/.test(path)

describe('safeReturnPath (properties)', () => {
  test.prop([fc.string({ unit: 'binary' })])('never leaves the origin, whatever the input', (candidate) => {
    const result = safeReturnPath(candidate)
    expect(result.startsWith('/')).toBe(true)
    expect(new URL(result, window.location.origin).origin).toBe(window.location.origin)
  })

  test.prop([fc.webPath()])('keeps any ordinary path other than the sign-in pages', (path) => {
    fc.pre(isOrdinary(path))
    const result = safeReturnPath(path)
    const url = new URL(path, window.location.origin)
    fc.pre(url.origin === window.location.origin)
    expect(result).toBe(url.pathname + url.search + url.hash)
  })

  test.prop([fc.webPath()])('round-trips through the login link', (path) => {
    fc.pre(isOrdinary(path))
    const redirect = new URL(loginPathFor(path), window.location.origin).searchParams.get('redirect')
    expect(redirect).toBe(path)
  })
})
