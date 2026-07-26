import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderStatusBadge } from './OrderStatusBadge'

describe('OrderStatusBadge', () => {
  it('renders a human-readable label for each status', () => {
    render(<OrderStatusBadge status="IN_PROGRESS" />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })
})
