import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { Category, InventoryItem, Page } from '../types/api'

export interface InventorySearchParams {
  title?: string
  categoryId?: string
  inStockOnly?: boolean
  page?: number
  size?: number
  enabled?: boolean
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function useInventory(params: InventorySearchParams) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () =>
      api.get<Page<InventoryItem>>(
        `/api/inventory${buildQuery({
          title: params.title,
          categoryId: params.categoryId,
          inStockOnly: params.inStockOnly || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        })}`,
      ),
    enabled: params.enabled ?? true,
    placeholderData: (previous) => previous,
  })
}

export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => api.get<InventoryItem>(`/api/inventory/${id}`),
    enabled: id !== undefined,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/categories'),
  })
}
