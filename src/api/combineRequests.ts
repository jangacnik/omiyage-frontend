import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { BrowsableShipmentDto, CombineRequestDto } from '../types/api'

export function useBrowsableShipments() {
  return useQuery({
    queryKey: ['shipments', 'browsable'],
    queryFn: () => api.get<BrowsableShipmentDto[]>('/api/shipments/browsable'),
  })
}

export function useIncomingCombineRequests() {
  return useQuery({
    queryKey: ['combine-requests', 'incoming'],
    queryFn: () => api.get<CombineRequestDto[]>('/api/orders/combine-requests/incoming'),
  })
}

export function useOutgoingCombineRequests() {
  return useQuery({
    queryKey: ['combine-requests', 'outgoing'],
    queryFn: () => api.get<CombineRequestDto[]>('/api/orders/combine-requests/outgoing'),
  })
}

function useInvalidateCombineRequests() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['combine-requests'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['shipments', 'mine'] })
  }
}

export function useSendCombineRequest() {
  const invalidate = useInvalidateCombineRequests()
  return useMutation({
    mutationFn: ({ requesterOrderId, targetShipmentId }: { requesterOrderId: string; targetShipmentId: string }) =>
      api.post<CombineRequestDto>('/api/orders/combine-requests', { requesterOrderId, targetShipmentId }),
    onSuccess: invalidate,
  })
}

export function useAcceptCombineRequest() {
  const invalidate = useInvalidateCombineRequests()
  return useMutation({
    mutationFn: (id: string) => api.post<CombineRequestDto>(`/api/orders/combine-requests/${id}/accept`),
    onSuccess: invalidate,
  })
}

export function useDeclineCombineRequest() {
  const invalidate = useInvalidateCombineRequests()
  return useMutation({
    mutationFn: (id: string) => api.post<CombineRequestDto>(`/api/orders/combine-requests/${id}/decline`),
    onSuccess: invalidate,
  })
}

export function useCancelCombineRequest() {
  const invalidate = useInvalidateCombineRequests()
  return useMutation({
    mutationFn: (id: string) => api.delete<CombineRequestDto>(`/api/orders/combine-requests/${id}`),
    onSuccess: invalidate,
  })
}
