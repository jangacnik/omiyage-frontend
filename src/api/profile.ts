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
