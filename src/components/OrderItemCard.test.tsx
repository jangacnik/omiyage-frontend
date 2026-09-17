import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OrderItemCard } from './OrderItemCard'
import type { OrderItemDto } from '../types/api'

function item(overrides: Partial<OrderItemDto> = {}): OrderItemDto {
  return {
    id: 'item-1',
    inventoryItemId: null,
    title: 'Kit Kat matcha',
    description: null,
    imageKey: null,
    condition: 'NEW',
    currency: 'EUR',
    maxPrice: 10,
    actualPrice: null,
    actualPriceCurrency: null,
    weight: null,
    status: 'REQUESTED',
    paid: false,
    paidAt: null,
    link: null,
    purchasedAt: null,
    quantity: 1,
    isPreorder: false,
    expectedReleaseDate: null,
    soldPrice: null,
    soldPriceCurrency: null,
    profit: null,
    ...overrides,
  }
}

describe('OrderItemCard', () => {
  it('shows the max price and a not-priced-yet note when nothing has been charged', () => {
    render(<OrderItemCard item={item({ maxPrice: 10 })} />)
    expect(screen.getByText(/Max you set:/)).toBeInTheDocument()
    expect(screen.getByText(/€10\.00/)).toBeInTheDocument()
    expect(screen.getByText(/Price not set yet/)).toBeInTheDocument()
  })

  it('shows both the max price and the sold price the member is charged', () => {
    render(<OrderItemCard item={item({ maxPrice: 10, soldPrice: 12, soldPriceCurrency: 'EUR' })} />)
    expect(screen.getByText(/Max you set:/)).toBeInTheDocument()
    expect(screen.getByText(/You pay:/)).toBeInTheDocument()
    expect(screen.getByText(/€12\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/actual price/)).not.toBeInTheDocument()
  })

  it('never renders the admin-only actualPrice (bought-in-JPY) field', () => {
    render(<OrderItemCard item={item({ maxPrice: 10, actualPrice: 1500, actualPriceCurrency: 'JPY' })} />)
    expect(screen.queryByText(/1,?500/)).not.toBeInTheDocument()
    expect(screen.queryByText(/¥/)).not.toBeInTheDocument()
  })

  it('opens a preview dialog with the item image and details when the thumbnail is clicked', async () => {
    const user = userEvent.setup()
    render(<OrderItemCard item={item({ title: 'Kit Kat matcha', description: 'Green tea flavor', maxPrice: 10 })} />)

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Preview Kit Kat matcha' }))

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getAllByText('Green tea flavor').length).toBeGreaterThan(0)
  })
})
