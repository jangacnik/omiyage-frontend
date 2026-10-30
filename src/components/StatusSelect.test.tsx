import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatusSelect } from './StatusSelect'

const OPTIONS = [
  { value: 'A', label: 'Alpha', tone: 'idle' as const },
  { value: 'B', label: 'Beta', tone: 'done' as const },
]

describe('StatusSelect', () => {
  it('shows the current state and reports changes', () => {
    const onChange = vi.fn()
    render(<StatusSelect value="A" options={OPTIONS} onChange={onChange} ariaLabel="Status" />)
    expect(screen.getByLabelText('Status')).toHaveValue('A')
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'B' } })
    expect(onChange).toHaveBeenCalledWith('B')
  })

  it('offers an empty option when emptyLabel is given', () => {
    render(<StatusSelect value="" options={OPTIONS} onChange={() => {}} ariaLabel="Status" emptyLabel="Don't change" />)
    expect(screen.getByRole('option', { name: "Don't change" })).toBeInTheDocument()
  })
})
