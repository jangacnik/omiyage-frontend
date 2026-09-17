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
  return {
    id: 'user-1',
    nickname: 'bob',
    email: null,
    phone: null,
    firstName: null,
    lastName: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    country: null,
    avatarKey: null,
    ...overrides,
  }
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
        return HttpResponse.json(profile({ addressLine1: '1 Shibuya', city: 'Tokyo' }))
      }),
    )

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')

    await user.type(screen.getByLabelText('Address line 1'), '1 Shibuya')
    await user.type(screen.getByLabelText('City'), 'Tokyo')
    await user.click(screen.getByText('Save'))

    await waitFor(() => expect(screen.getByText('Saved.')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({ addressLine1: '1 Shibuya', city: 'Tokyo' })
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

  it('renames the nickname', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile())),
      http.patch(`${BASE}/api/users/me/nickname`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(profile({ nickname: 'bobby' }))
      }),
    )

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')
    await user.click(screen.getByRole('button', { name: 'Rename' }))

    const input = screen.getByLabelText('Nickname')
    await user.clear(input)
    await user.type(input, 'bobby')
    await user.click(screen.getByRole('button', { name: 'Save nickname' }))

    await waitFor(() => expect(capturedBody).toEqual({ nickname: 'bobby' }))
    expect(await screen.findByText('Nickname: bobby')).toBeInTheDocument()
  })

  it('shows a conflict message when the new nickname is taken', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile())),
      http.patch(`${BASE}/api/users/me/nickname`, () => HttpResponse.json({ error: 'nickname taken' }, { status: 409 })),
    )

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await user.click(screen.getByRole('button', { name: 'Save nickname' }))

    expect(await screen.findByText('That nickname is already taken.')).toBeInTheDocument()
  })

  it('changes the password when the current password is correct', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile())),
      http.patch(`${BASE}/api/users/me/password`, async ({ request }) => {
        capturedBody = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')

    await user.type(screen.getByLabelText('Current password'), 'old-pass')
    await user.type(screen.getByLabelText('New password'), 'new-password-123')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-123')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => expect(capturedBody).toEqual({ oldPassword: 'old-pass', newPassword: 'new-password-123' }))
    expect(await screen.findByText('Password changed.')).toBeInTheDocument()
  })

  it('rejects mismatched password confirmation before submitting', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile())))

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')

    await user.type(screen.getByLabelText('Current password'), 'old-pass')
    await user.type(screen.getByLabelText('New password'), 'new-password-123')
    await user.type(screen.getByLabelText('Confirm new password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
  })

  it('shows an error when the current password is wrong', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile())),
      http.patch(`${BASE}/api/users/me/password`, () => HttpResponse.json({ error: 'incorrect password' }, { status: 401 })),
    )

    renderWithProviders(<ProfilePage />)
    await screen.findByText('Nickname: bob')

    await user.type(screen.getByLabelText('Current password'), 'wrong')
    await user.type(screen.getByLabelText('New password'), 'new-password-123')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-123')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument()
  })
})
