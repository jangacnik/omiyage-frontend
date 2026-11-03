import { describe, expect, it } from 'vitest'
import { ApiError } from './apiClient'
import { queryClient, shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it.each([400, 403, 404, 499])('does not retry a %i', (status) => {
    expect(shouldRetry(0, new ApiError(status, 'nope'))).toBe(false)
  })

  it('retries server and network errors up to three times', () => {
    expect(shouldRetry(0, new ApiError(500, 'boom'))).toBe(true)
    expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetry(3, new ApiError(503, 'busy'))).toBe(false)
  })

  it('is the default for queries', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(shouldRetry)
  })
})
