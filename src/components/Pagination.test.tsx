import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={0} totalPages={1} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('disables Previous on the first page and Next on the last page', () => {
    render(<Pagination page={0} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByText('Previous')).toBeDisabled()
    expect(screen.getByText('Next')).not.toBeDisabled()
  })

  it('calls onPageChange with the next page number', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByText('Next'))
    expect(onPageChange).toHaveBeenCalledWith(2)

    await user.click(screen.getByText('Previous'))
    expect(onPageChange).toHaveBeenCalledWith(0)
  })
})
