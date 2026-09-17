import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { InventoryCard } from './InventoryCard'
import { useCartStore } from '../store/cartStore'
import type { InventoryItem } from '../types/api'

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    title: 'Kit Kat matcha',
    description: null,
    link: null,
    condition: 'NEW',
    priceAmount: 12,
    currency: 'EUR',
    stockQuantity: 5,
    status: 'ACTIVE',
    images: [],
    categories: [],
    tags: [],
    isPreorder: false,
    expectedReleaseDate: null,
    weight: 300,
    boughtPrice: null,
    profitEur: null,
    ...overrides,
  }
}

function renderCard(props: Partial<React.ComponentProps<typeof InventoryCard>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InventoryCard item={item()} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('InventoryCard', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
    localStorage.clear()
  })

  it('shows weight next to the price', () => {
    renderCard()
    expect(screen.getByText(/€12\.00/)).toBeInTheDocument()
    expect(screen.getByText(/300 g/)).toBeInTheDocument()
  })

  it('has no full-width "Add to cart" text button', () => {
    renderCard()
    expect(screen.queryByText('Add to cart')).not.toBeInTheDocument()
  })

  it('adds the stepper-selected quantity via the corner quick-add button', async () => {
    const user = userEvent.setup()
    renderCard()

    const stepper = screen.getByRole('group', { name: /Quantity of Kit Kat matcha to add/ })
    await user.click(within(stepper).getByLabelText('Increase quantity'))
    await user.click(within(stepper).getByLabelText('Increase quantity'))

    await user.click(screen.getByLabelText('Add Kit Kat matcha to cart'))

    expect(useCartStore.getState().items).toEqual([expect.objectContaining({ inventoryItemId: 'item-1', quantity: 3 })])
  })

  it('resets the stepper back to 1 after adding to cart', async () => {
    const user = userEvent.setup()
    renderCard()

    const stepper = screen.getByRole('group', { name: /Quantity of Kit Kat matcha to add/ })
    await user.click(within(stepper).getByLabelText('Increase quantity'))
    await user.click(screen.getByLabelText('Add Kit Kat matcha to cart'))

    expect(within(stepper).getByText('1')).toBeInTheDocument()
  })
})
