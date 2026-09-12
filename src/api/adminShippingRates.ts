import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { ExchangeRateDto, ShipmentDestination, ShippingMethod, ShippingRateDto } from '../types/api'

export interface ShippingRateInput {
  destination: ShipmentDestination
  shippingMethod: ShippingMethod
  maxWeightGrams: number
  costJpy: number
  estimatedDays: number
}

export function useShippingRates() {
  return useQuery({
    queryKey: ['admin', 'shipping-rates'],
    queryFn: () => api.get<ShippingRateDto[]>('/api/admin/shipping-rates'),
  })
}

export function useCreateShippingRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ShippingRateInput) => api.post<ShippingRateDto>('/api/admin/shipping-rates', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] }),
  })
}

export function useUpdateShippingRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: ShippingRateInput & { id: string }) =>
      api.patch<ShippingRateDto>(`/api/admin/shipping-rates/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] }),
  })
}

export function useDeleteShippingRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/shipping-rates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] }),
  })
}

export function useAdminExchangeRate() {
  return useQuery({
    queryKey: ['admin', 'exchange-rate'],
    queryFn: () => api.get<ExchangeRateDto>('/api/admin/exchange-rate'),
  })
}

export function useSetExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jpyPerEur: number) => api.put<ExchangeRateDto>('/api/admin/exchange-rate', { jpyPerEur }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exchange-rate'] })
      // The public, no-markup rate every page's currency toggle reads from - must reflect
      // the admin's new value immediately, not just the admin-only view of it.
      queryClient.invalidateQueries({ queryKey: ['exchange-rate'] })
    },
  })
}
