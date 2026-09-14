import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'

export interface ExchangeRateDto {
  jpyPerEur: number
}

export function useExchangeRate() {
  return useQuery({
    queryKey: ['admin', 'exchange-rate'],
    queryFn: () => api.get<ExchangeRateDto>('/api/admin/exchange-rate'),
  })
}

export function useSetExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jpyPerEur: number) => api.put<ExchangeRateDto>('/api/admin/exchange-rate', { jpyPerEur }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'exchange-rate'] }),
  })
}
