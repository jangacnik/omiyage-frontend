import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { MemberShipmentDto } from '../types/api'

export function useMyShipments() {
  return useQuery({
    queryKey: ['shipments', 'mine'],
    queryFn: () => api.get<MemberShipmentDto[]>('/api/shipments/mine'),
  })
}

export function useMyShipmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['shipments', 'mine', id],
    queryFn: () => api.get<MemberShipmentDto>(`/api/shipments/mine/${id}`),
    enabled: id !== undefined,
  })
}

export function useUpdateMyShipmentTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string | null }) =>
      api.patch<MemberShipmentDto>(`/api/shipments/mine/${id}/title`, { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments', 'mine'] }),
  })
}

export function useMarkShipmentArrived() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<MemberShipmentDto>(`/api/shipments/mine/${id}/mark-arrived`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments', 'mine'] }),
  })
}
