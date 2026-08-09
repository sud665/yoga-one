import { test, expect } from '@playwright/test'

test('owner can issue an instructor invite link', async ({ page }) => {
  const uniqueEmail = `owner-invite-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('초대 테스트 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill('초대 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '강사 초대 링크 발급' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '발급' }).click()

  await expect(page.getByText(/발급된 링크/)).toBeVisible()
  // The row leads with the Korean role label now; the raw enum no longer
  // renders anywhere on this screen.
  await expect(page.getByRole('listitem').first()).toContainText('강사 초대')
})
