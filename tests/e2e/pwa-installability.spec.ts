import { test, expect } from '@playwright/test'

test('manifest and service worker are served', async ({ page, request }) => {
  await page.goto('/login')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBe('/manifest.json')

  const manifestResponse = await request.get('/manifest.json')
  expect(manifestResponse.ok()).toBe(true)

  const swResponse = await request.get('/sw.js')
  expect(swResponse.ok()).toBe(true)
})
