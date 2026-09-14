import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { Category, Condition, Currency, InventoryItem, Page } from '../types/api'

export interface InventoryItemInput {
  title: string
  description?: string
  link?: string
  condition: Condition
  priceAmount: number
  currency: Currency
  boughtPrice?: number
  stockQuantity: number
  imageKeys?: string[]
  categoryIds?: string[]
  tags?: string[]
  isPreorder?: boolean
  expectedReleaseDate?: string
}

export function useAdminInventory(page: number) {
  return useQuery({
    queryKey: ['admin', 'inventory', page],
    queryFn: () => api.get<Page<InventoryItem>>(`/api/admin/inventory?page=${page}&size=20`),
    placeholderData: (previous) => previous,
  })
}

// The member-facing catalog reads via ['inventory', params] / ['inventory-item', id] - a
// different cache bucket than ['admin', 'inventory']. Same class of bug as the admin
// order-detail cache fix: without also invalidating these, a member's already-open Inventory
// page or item detail page never reflects an admin's create/edit/delete until they navigate
// away and back.
export function useCreateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InventoryItemInput) => api.post<InventoryItem>('/api/admin/inventory', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: InventoryItemInput & { id: string }) =>
      api.put<InventoryItem>(`/api/admin/inventory/${id}`, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-item', id] })
    },
  })
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/inventory/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-item', id] })
    },
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/categories'),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; slug: string }) => api.post<Category>('/api/admin/categories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}
