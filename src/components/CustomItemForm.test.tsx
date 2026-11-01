import { act, fireEvent, render, waitFor } from '@testing-library/react'
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
})
