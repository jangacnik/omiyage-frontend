import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CustomItemForm } from './OrderItemBuilder'

describe('CustomItemForm', () => {
  it('submits once when the form is submitted twice before the first request finishes', async () => {
    const onAdd = vi.fn(() => new Promise<void>(() => {}))
    const { container } = render(<CustomItemForm onAdd={onAdd} />)
    fireEvent.change(container.querySelector('input.field-input') as HTMLInputElement, { target: { value: 'Frieren card' } })
    const form = container.querySelector('form') as HTMLFormElement

    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('groups fields into Basics, Pricing and Details with one primary submit', () => {
    render(<CustomItemForm onAdd={vi.fn()} />)

    const groups = screen.getAllByRole('group').filter((group) => group.tagName === 'FIELDSET')
    expect(groups.map((group) => group.querySelector('legend')?.textContent)).toEqual(['Basics', 'Pricing', 'Details'])
    expect(groups[0]).toContainElement(screen.getByLabelText('Title'))
    expect(groups[1]).toContainElement(screen.getByLabelText('Max price'))
    expect(groups[2]).toContainElement(screen.getByLabelText('Condition'))
    expect(screen.getByRole('button', { name: 'Add item' })).toHaveClass('btn-primary')
  })

  it('submits the quantity picked with the stepper', async () => {
    const onAdd = vi.fn()
    render(<CustomItemForm onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Frieren card' } })

    fireEvent.click(screen.getByLabelText('Increase quantity'))
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({ quantity: 2 }) })))
  })
})
