import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { api, ApiError } from './apiClient'
import { useAuthStore } from '../store/authStore'

const errorStatus = fc.integer({ min: 400, max: 599 })
const successStatus = fc.integer({ min: 200, max: 299 }).filter((status) => status !== 204 && status !== 205)

const respondWith = (response: Response) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null, sessionExpired: false })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test.prop([errorStatus, fc.string({ minLength: 1 })])('a non-2xx JSON response becomes an ApiError with status and message', async (status, error) => {
    respondWith(jsonResponse({ error }, status))

    const failure = await api.get('/api/x').catch((caught: unknown) => caught)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status, message: error })
  })

  test.prop([errorStatus, fc.constantFrom('text/plain', 'text/html', 'application/octet-stream'), fc.string()])(
    'a non-JSON error body becomes an ApiError instead of a parse error',
    async (status, contentType, text) => {
      respondWith(new Response(text, { status, headers: { 'content-type': contentType } }))

      const failure = await api.get('/api/x').catch((caught: unknown) => caught)

      expect(failure).toBeInstanceOf(ApiError)
      expect((failure as ApiError).status).toBe(status)
      expect(typeof (failure as ApiError).message).toBe('string')
    },
  )

  test.prop([errorStatus, fc.jsonValue()])('any JSON error body yields an ApiError with a string message', async (status, body) => {
    respondWith(jsonResponse(body, status))

    const failure = await api.get('/api/x').catch((caught: unknown) => caught)

    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).status).toBe(status)
    expect(typeof (failure as ApiError).message).toBe('string')
  })

  test.prop([successStatus, fc.jsonValue().map((value) => JSON.parse(JSON.stringify(value)))])(
    'a 2xx JSON response resolves to the parsed body',
    async (status, body) => {
      respondWith(jsonResponse(body, status))

      await expect(api.get('/api/x')).resolves.toEqual(body)
    },
  )
})
