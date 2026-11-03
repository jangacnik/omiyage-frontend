import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuantityStepper } from './QuantityStepper'
import { MAX_ITEM_QUANTITY } from '../store/cartStore'

describe('QuantityStepper', () => {
  it('disables "+" at the maximum item quantity by default', () => {
    render(<QuantityStepper quantity={MAX_ITEM_QUANTITY} onChange={() => {}} label="Quantity" />)

    expect(screen.getByLabelText('Increase quantity')).toBeDisabled()
  })

  it('increases below the maximum', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper quantity={4} max={5} onChange={onChange} label="Quantity" />)

    await userEvent.click(screen.getByLabelText('Increase quantity'))

    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('disables "+" at a custom maximum', () => {
    render(<QuantityStepper quantity={5} max={5} onChange={() => {}} label="Quantity" />)

    expect(screen.getByLabelText('Increase quantity')).toBeDisabled()
  })
})
