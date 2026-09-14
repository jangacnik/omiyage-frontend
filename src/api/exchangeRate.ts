import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'

export interface ExchangeRateDto {
  jpyPerEur: number
}

export interface ShippingExchangeRateDto {
  shippingJpyPerEur: number
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

export function useShippingExchangeRate() {
  return useQuery({
    queryKey: ['admin', 'exchange-rate', 'shipping'],
    queryFn: () => api.get<ShippingExchangeRateDto>('/api/admin/exchange-rate/shipping'),
  })
}

export function useSetShippingExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (shippingJpyPerEur: number) =>
      api.put<ShippingExchangeRateDto>('/api/admin/exchange-rate/shipping', { shippingJpyPerEur }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'exchange-rate', 'shipping'] }),
  })
}
