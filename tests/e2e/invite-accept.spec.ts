import { test, expect } from '@playwright/test'

test('an instructor can sign up via an owner-issued invite link', async ({ page, context }) => {
  const ownerEmail = `owner-inviteflow-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('초대 플로우 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill('플로우 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '강사 초대 링크 발급' }).click()
  const link = await page.getByRole('link').first()
  const inviteUrl = await link.getAttribute('href')
  expect(inviteUrl).toBeTruthy()

  const instructorPage = await context.newPage()
  await instructorPage.goto(inviteUrl!)
  await expect(instructorPage.getByRole('heading')).toContainText('강사 초대')

  await instructorPage.getByPlaceholder('이름').fill('신규 강사')
  await instructorPage.getByPlaceholder('이메일').fill(`instructor-${Date.now()}@test.local`)
  await instructorPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await instructorPage.getByRole('button', { name: '강사로 가입하기' }).click()

  await expect(instructorPage).toHaveURL(/\/instructor/)
})

test('an expired or invalid invite code shows a clear error', async ({ page }) => {
  await page.goto('/invite/does-not-exist-code')
  await expect(page.getByText(/유효하지 않은 초대 링크/)).toBeVisible()
})
