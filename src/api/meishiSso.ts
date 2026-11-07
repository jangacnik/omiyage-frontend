import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import { callbackUri } from '../lib/meishiSso'
import { useAuthStore } from '../store/authStore'

export interface PublicConfig {
  meishiSso: { enabled: boolean; authorizeUrl: string | null; clientId: string | null }
}

/** Runtime switch from omiyage-api, so the button appears or disappears without a rebuild. A failed request means no button. */
export function useMeishiSsoConfig() {
  const signedIn = useAuthStore((s) => s.token !== null)
  const query = useQuery({
    queryKey: ['public-config'],
    queryFn: () => api.get<PublicConfig>('/api/auth/config'),
    retry: false,
    staleTime: 60_000,
    enabled: !signedIn,
  })
  const sso = query.data?.meishiSso
  return sso?.enabled && sso.authorizeUrl && isHttps(sso.authorizeUrl) && sso.clientId
    ? { authorizeUrl: sso.authorizeUrl, clientId: sso.clientId }
    : null
}

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function useMeishiExchange() {
  return useMutation({
    mutationFn: (input: { code: string; verifier: string }) =>
      api.post<{ token: string }>('/api/auth/meishi/exchange', {
        code: input.code,
        codeVerifier: input.verifier,
        redirectUri: callbackUri(),
      }),
  })
}
