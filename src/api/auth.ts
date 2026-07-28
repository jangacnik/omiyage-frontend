import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import { useAuthStore } from '../store/authStore'

export interface LoginInput {
  nickname: string
  password: string
}

interface TokenResponse {
  token: string
}

export function useLogin() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<TokenResponse>('/api/auth/login', input),
    onSuccess: (data) => login(data.token),
  })
}
