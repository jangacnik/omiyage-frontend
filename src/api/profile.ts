import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { UserProfileDto } from '../types/api'

export interface UpdateProfileInput {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  addressLine1?: string
  addressLine2?: string
  postalCode?: string
  city?: string
  country?: string
  discordName?: string
  avatarKey?: string | null
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => api.get<UserProfileDto>('/api/users/me'),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<UserProfileDto>('/api/users/me', input),
    onSuccess: (profile) => queryClient.setQueryData(['profile', 'me'], profile),
  })
}

export function useUpdateMyNickname() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nickname: string) => api.patch<UserProfileDto>('/api/users/me/nickname', { nickname }),
    onSuccess: (profile) => queryClient.setQueryData(['profile', 'me'], profile),
  })
}

export function useChangeMyPassword() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      api.patch<void>('/api/users/me/password', { oldPassword, newPassword }),
  })
}
