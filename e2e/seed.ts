import type { APIRequestContext } from '@playwright/test'

/**
 * Seeds fresh MeishiApi accounts for a single test run via the admin API, bypassing the UI.
 * Requires a pre-existing seeded Meishi admin (see root README's "Run e2e tests" section) —
 * MeishiApi has no self-registration, accounts only exist once an admin creates a slot.
 */

const MEISHI_API_URL = process.env.E2E_MEISHI_API_URL ?? 'http://localhost:8080'
const SEED_ADMIN_NICKNAME = process.env.E2E_MEISHI_ADMIN_NICKNAME
const SEED_ADMIN_PASSWORD = process.env.E2E_MEISHI_ADMIN_PASSWORD

export interface SeededAccount {
  nickname: string
  token: string
}

async function seedAdminToken(request: APIRequestContext): Promise<string> {
  if (!SEED_ADMIN_NICKNAME || !SEED_ADMIN_PASSWORD) {
    throw new Error(
      'E2E_MEISHI_ADMIN_NICKNAME / E2E_MEISHI_ADMIN_PASSWORD must be set to a pre-existing MeishiApi admin account to run e2e tests.',
    )
  }
  const response = await request.post(`${MEISHI_API_URL}/api/auth/login`, {
    data: { nickname: SEED_ADMIN_NICKNAME, password: SEED_ADMIN_PASSWORD },
  })
  if (!response.ok()) throw new Error(`could not log in seed admin: ${response.status()}`)
  return (await response.json()).token
}

async function createAccount(request: APIRequestContext, adminToken: string, role: 'USER' | 'ADMIN'): Promise<SeededAccount> {
  const createResponse = await request.post(`${MEISHI_API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { role },
  })
  if (!createResponse.ok()) throw new Error(`could not create ${role} slot: ${createResponse.status()}`)
  const { activationKey } = await createResponse.json()

  const nickname = `e2e-${role.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const password = 'e2e-test-password-1'
  const registerResponse = await request.post(`${MEISHI_API_URL}/api/auth/register`, {
    data: { activationKey, nickname, password },
  })
  if (!registerResponse.ok()) throw new Error(`could not activate ${role} account: ${registerResponse.status()}`)
  const { token } = await registerResponse.json()

  return { nickname, token }
}

export async function seedUserAndAdmin(request: APIRequestContext): Promise<{ user: SeededAccount; admin: SeededAccount }> {
  const adminToken = await seedAdminToken(request)
  const user = await createAccount(request, adminToken, 'USER')
  const admin = await createAccount(request, adminToken, 'ADMIN')
  return { user, admin }
}
