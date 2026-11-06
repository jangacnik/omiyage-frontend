import { useAuthStore } from '../store/authStore'
import { queryClient } from './queryClient'

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.MODE === 'test' ? 'http://localhost:8081' : '')

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** The one place every "X.isError && <p>...</p>" block should get its text from - prefers the
 *  backend's own message (it usually explains exactly why the request was rejected) and only
 *  falls back to the caller's copy for a non-ApiError failure (network drop, etc). */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (response.status === 204) return undefined as T

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json().catch(() => undefined) : undefined

  if (response.status === 401 && token && token === useAuthStore.getState().token) {
    useAuthStore.getState().expireSession()
    queryClient.clear()
  }

  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? response.statusText)
  }
  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<T>(path, { method: 'POST', body: formData })
  },
}
