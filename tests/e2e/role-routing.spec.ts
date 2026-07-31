import { test, expect } from '@playwright/test'

test('an owner cannot access the instructor or member route prefixes', async ({ page }) => {
  const uniqueEmail = `owner-routing-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('라우팅 테스트 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill('라우팅 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/instructor')
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/member')
  await expect(page).toHaveURL(/\/admin/)
})
