import { test, expect, type Page } from '@playwright/test'
import { seedUserAndAdmin } from './seed'

/**
 * Drives the full app over real HTTP against a live backend, MinIO, and MeishiApi. See
 * "Run e2e tests" in the root README for the docker-compose + seed-admin prerequisites —
 * this suite seeds its own throwaway user/admin accounts per run, it does not reuse the
 * seed admin for the flow itself.
 */

async function loginAs(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('omiyage.token', t), token)
}

test('user requests an existing item and a custom item; admin fulfills both', async ({ browser, request }) => {
  const { user, admin } = await seedUserAndAdmin(request)

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await loginAs(adminPage, admin.token)

  // Admin creates a category and an inventory item with a photo.
  await adminPage.goto('/admin/categories')
  await adminPage.getByLabel('Category name').fill('Snacks')
  await adminPage.getByText('Add category').click()
  await expect(adminPage.getByText('Snacks')).toBeVisible()

  await adminPage.goto('/admin/inventory')
  await adminPage.getByLabel('Title').fill('Kit Kat matcha 12-pack')
  await adminPage.getByLabel('Price').fill('1200')
  await adminPage.getByLabel('Stock quantity').fill('5')
  await adminPage
    .getByLabel('Photo')
    .setInputFiles({ name: 'kitkat.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-bytes') })
  await adminPage.getByLabel('Snacks').check()
  await adminPage.getByText('Create item').click()
  await expect(adminPage.getByText(/Kit Kat matcha 12-pack/)).toBeVisible()

  const userContext = await browser.newContext()
  const userPage = await userContext.newPage()
  await loginAs(userPage, user.token)

  // User finds the item via search and starts a request for it.
  await userPage.goto('/inventory')
  await userPage.getByLabel('Search by title').fill('kit kat')
  await userPage.getByText('Kit Kat matcha 12-pack').click()
  await userPage.getByText('Request this item').click()
  await expect(userPage.getByText(/Inventory item: Kit Kat matcha/)).toBeVisible()

  // User adds a second, custom request item with its own photo.
  await userPage.getByLabel('Title').fill('Ghibli museum ticket')
  await userPage.getByLabel('Max price').fill('2000')
  await userPage
    .getByLabel('Photo')
    .setInputFiles({ name: 'ghibli.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-bytes') })
  await userPage.getByText('Add item').click()
  await expect(userPage.getByText(/Ghibli museum ticket/)).toBeVisible()

  await userPage.getByText('Submit request').click()
  await expect(userPage).toHaveURL(/\/orders\/[0-9a-f-]+/)
  const orderId = userPage.url().split('/orders/')[1]

  // Admin sees the new order, marks the inventory item purchased, and advances the status.
  await adminPage.goto('/admin/orders')
  await expect(adminPage.getByText(new RegExp(`Order ${orderId.slice(0, 8)}`))).toBeVisible()
  const orderCard = adminPage.locator('li', { hasText: orderId.slice(0, 8) })
  await orderCard.getByRole('checkbox').first().check()
  await orderCard.getByLabel(`Update status for order ${orderId}`).selectOption('IN_PROGRESS')

  // User sees the updated status and purchased flag.
  await userPage.goto(`/orders/${orderId}`)
  await expect(userPage.getByText('In progress')).toBeVisible()
  await expect(userPage.getByText('Purchased')).toBeVisible()
  await expect(userPage.getByText('Not purchased yet')).toBeVisible()
})
