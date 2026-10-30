import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import { BASKET_ENABLED } from '../lib/features'
import { cartItemFromInventoryItem, useCartStore } from '../store/cartStore'
import type { BasketLineDto, Currency, InventoryItem } from '../types/api'

export interface AddBasketLineInput {
  inventoryItemId?: string
  customTitle?: string
  customDescription?: string
  currency: Currency
  maxPrice?: number
  quantity?: number
}

export interface UpdateBasketLineInput {
  customTitle?: string
  customDescription?: string
  maxPrice?: number
  quantity: number
}

const BASKET_KEY = ['basket']

export function useBasket(enabled = true) {
  return useQuery({
    queryKey: BASKET_KEY,
    queryFn: () => api.get<BasketLineDto[]>('/api/basket'),
    enabled,
  })
}

export function useAddBasketLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddBasketLineInput) => api.post<BasketLineDto>('/api/basket/lines', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BASKET_KEY }),
  })
}

export function useUpdateBasketLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBasketLineInput & { id: string }) =>
      api.put<BasketLineDto>(`/api/basket/lines/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BASKET_KEY }),
  })
}

export function useRemoveBasketLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/basket/lines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BASKET_KEY }),
  })
}

/** The one "Add to cart" action for catalog items: a basket line when the basket is enabled,
 *  the local cart otherwise. `onAdded` runs once the item is actually in either. */
export function useAddInventoryItem() {
  const addToCart = useCartStore((s) => s.addItem)
  const addLine = useAddBasketLine()

  return (item: InventoryItem, quantity: number, onAdded: () => void) => {
    if (BASKET_ENABLED) {
      addLine.mutate({ inventoryItemId: item.id, currency: item.currency, quantity }, { onSuccess: onAdded })
      return
    }
    addToCart(cartItemFromInventoryItem(item), quantity)
    onAdded()
  }
}
