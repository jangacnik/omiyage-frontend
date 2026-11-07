import { beforeEach, describe, expect, it } from 'vitest'
import { buildAuthorizeUrl, callbackUri, checkCallback } from './meishiSso'

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pending() {
  return JSON.parse(sessionStorage.getItem('omiyage.meishiSso') as string) as { state: string; verifier: string }
}

describe('meishiSso', () => {
  beforeEach(() => sessionStorage.clear())

  describe('buildAuthorizeUrl', () => {
    it('builds an S256 authorization request for the registered callback', async () => {
      const url = new URL(await buildAuthorizeUrl('https://meishi.example/oauth/authorize', 'omiyage'))
      const { state, verifier } = pending()

      expect(`${url.origin}${url.pathname}`).toBe('https://meishi.example/oauth/authorize')
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('client_id')).toBe('omiyage')
      expect(url.searchParams.get('redirect_uri')).toBe(callbackUri())
      expect(url.searchParams.get('state')).toBe(state)
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
      expect(url.searchParams.get('code_challenge')).toBe(base64Url(new Uint8Array(digest)))
    })

    it('uses a fresh url-safe state and verifier of at least 43 characters every time', async () => {
      await buildAuthorizeUrl('https://meishi.example/oauth/authorize', 'omiyage')
      const first = pending()
      await buildAuthorizeUrl('https://meishi.example/oauth/authorize', 'omiyage')
      const second = pending()

      expect(second.state).not.toBe(first.state)
      expect(second.verifier).not.toBe(first.verifier)
      expect(first.verifier).toMatch(/^[A-Za-z0-9_-]{43,}$/)
      expect(first.state).toMatch(/^[A-Za-z0-9_-]{43,}$/)
    })
  })

  describe('checkCallback', () => {
    async function startLogin() {
      await buildAuthorizeUrl('https://meishi.example/oauth/authorize', 'omiyage')
      return pending()
    }

    it('accepts a matching state and hands back the code and verifier', async () => {
      const { state, verifier } = await startLogin()

      expect(checkCallback(new URLSearchParams({ code: 'abc', state }))).toEqual({ ok: true, code: 'abc', verifier })
    })

    it('can only be used once', async () => {
      const { state } = await startLogin()
      checkCallback(new URLSearchParams({ code: 'abc', state }))

      expect(checkCallback(new URLSearchParams({ code: 'abc', state }))).toEqual({ ok: false, reason: 'invalid' })
    })

    it('rejects a different state and still consumes the pending login', async () => {
      const { state } = await startLogin()

      expect(checkCallback(new URLSearchParams({ code: 'abc', state: 'other' }))).toEqual({ ok: false, reason: 'invalid' })
      expect(checkCallback(new URLSearchParams({ code: 'abc', state }))).toEqual({ ok: false, reason: 'invalid' })
    })

    it('rejects a response without a code or without a pending login', async () => {
      const { state } = await startLogin()
      expect(checkCallback(new URLSearchParams({ state }))).toEqual({ ok: false, reason: 'invalid' })
      expect(checkCallback(new URLSearchParams({ code: 'abc', state }))).toEqual({ ok: false, reason: 'invalid' })
    })

    it('treats unreadable pending data as invalid', () => {
      for (const raw of ['not json', '{"state":1,"verifier":"v"}', 'null']) {
        sessionStorage.setItem('omiyage.meishiSso', raw)
        expect(checkCallback(new URLSearchParams({ code: 'abc', state: 'x' }))).toEqual({ ok: false, reason: 'invalid' })
      }
    })

    it('reports an error response from Meishi as denied', async () => {
      const { state } = await startLogin()

      expect(checkCallback(new URLSearchParams({ error: 'access_denied', state }))).toEqual({ ok: false, reason: 'denied' })
    })
  })
})
