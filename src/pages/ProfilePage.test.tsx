import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { ProfilePage } from './ProfilePage'
import type { UserProfileDto } from '../types/api'

const BASE = 'http://localhost:8081'

function profile(overrides: Partial<UserProfileDto> = {}): UserProfileDto {
  return { id: 'user-1', nickname: 'bob', email: null, phone: null, shippingAddress: null, ...overrides }
}

describe('ProfilePage', () => {
  it('pre-fills the form with the current profile', async () => {
    server.use(http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile({ email: 'bob@example.com' }))))

    renderWithProviders(<ProfilePage />)

    expect(await screen.findByDisplayValue('bob@example.com')).toBeInTheDocument()
    expect(screen.getByText('Nickname: bob')).toBeInTheDocument()
  })

  it('submits edited fields and shows a saved confirmation', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile())),
      http.patch(`${BASE}/api/users/me`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(profile({ shippingAddress: '1 Shibuya, Tokyo' }))
      }),
    )

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')

    await user.type(screen.getByLabelText('Shipping address'), '1 Shibuya, Tokyo')
    await user.click(screen.getByText('Save'))

    await waitFor(() => expect(screen.getByText('Saved.')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({ shippingAddress: '1 Shibuya, Tokyo' })
  })

  it('rejects an invalid email', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile())))

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByText('Save'))

    expect(await screen.findByText('Invalid email')).toBeInTheDocument()
  })
})
