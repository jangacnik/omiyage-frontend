import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { ItemTemplateDto } from '../types/api'

export interface ItemTemplateInput {
  name: string
  title?: string
  description?: string
  priceAmount?: number
  boughtPrice?: number
  weight?: number
}

export function useItemTemplates() {
  return useQuery({
    queryKey: ['admin', 'item-templates'],
    queryFn: () => api.get<ItemTemplateDto[]>('/api/admin/item-templates'),
  })
}

export function useCreateItemTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ItemTemplateInput) => api.post<ItemTemplateDto>('/api/admin/item-templates', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'item-templates'] }),
  })
}

export function useUpdateItemTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: ItemTemplateInput & { id: string }) =>
      api.patch<ItemTemplateDto>(`/api/admin/item-templates/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'item-templates'] }),
  })
}

export function useDeleteItemTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/item-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'item-templates'] }),
  })
}
