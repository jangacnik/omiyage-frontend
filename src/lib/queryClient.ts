import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './apiClient'

const MAX_RETRIES = 3

/** A 4xx (not found, forbidden, invalid) will not change on retry, so show it at once. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < MAX_RETRIES
}

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } })
