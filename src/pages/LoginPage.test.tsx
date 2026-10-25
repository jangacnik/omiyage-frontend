import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('announces empty-field errors and links them to the inputs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const nickname = await screen.findByLabelText('Nickname')
    expect(nickname).toHaveAttribute('aria-invalid', 'true')
    expect(nickname).toHaveAccessibleDescription('Enter your nickname')
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })
})
