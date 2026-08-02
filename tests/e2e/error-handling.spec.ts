import { test, expect } from '@playwright/test'

test('offline banner is hidden while online, appears offline, and disappears when back online', async ({
  page,
  context,
}) => {
  await page.goto('/login')
  await expect(page.getByTestId('offline-banner')).not.toBeVisible()

  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.getByTestId('offline-banner')).toBeVisible()
  await expect(page.getByTestId('offline-banner')).toContainText('인터넷 연결이 끊겼습니다')

  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByTestId('offline-banner')).not.toBeVisible()
})

test('forbidden page renders with guidance to go home', async ({ page }) => {
  await page.goto('/error/forbidden')
  await expect(page.getByRole('heading')).toContainText('접근할 수 없습니다')
  await expect(page.getByRole('link', { name: '홈으로 돌아가기' })).toBeVisible()
})

test('forbidden page is reachable by an authenticated user without bouncing to their role home', async ({
  page,
}) => {
  const uniqueEmail = `forbidden-owner-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('포비든 테스트 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill('포비든 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/error/forbidden')
  await expect(page).toHaveURL(/\/error\/forbidden/)
  await expect(page.getByRole('heading')).toContainText('접근할 수 없습니다')
})
