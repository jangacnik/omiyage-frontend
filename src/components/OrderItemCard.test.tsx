import { render, screen } from '@testing-library/react'
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
  it('shows the max price when nothing has been charged yet', () => {
    render(<OrderItemCard item={item({ maxPrice: 10 })} />)
    expect(screen.getByText(/€10\.00 max/)).toBeInTheDocument()
  })

  it('shows only the max price, never the actual/sold price', () => {
    render(<OrderItemCard item={item({ maxPrice: 10, soldPrice: 12, soldPriceCurrency: 'EUR' })} />)
    expect(screen.getByText(/€10\.00 max/)).toBeInTheDocument()
    expect(screen.queryByText(/€12\.00/)).not.toBeInTheDocument()
    expect(screen.queryByText(/actual price/)).not.toBeInTheDocument()
    expect(screen.queryByText(/sold for/)).not.toBeInTheDocument()
  })

  it('never renders the admin-only actualPrice (bought-in-JPY) field', () => {
    render(<OrderItemCard item={item({ maxPrice: 10, actualPrice: 1500, actualPriceCurrency: 'JPY' })} />)
    expect(screen.queryByText(/1,?500/)).not.toBeInTheDocument()
    expect(screen.queryByText(/¥/)).not.toBeInTheDocument()
  })
})
