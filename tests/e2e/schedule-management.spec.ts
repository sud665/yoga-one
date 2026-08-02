import { test, expect } from '@playwright/test'

test('owner can create a recurring class template and see generated sessions', async ({ page }) => {
  const uniqueEmail = `owner-schedule-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('시간표 테스트 요가원')
  // { exact: true }: '이름' is otherwise a substring match of '요가원 이름' too,
  // which trips Playwright's strict-mode locator resolution (same fix as
  // owner-signup.spec.ts / invite-issue.spec.ts / role-routing.spec.ts).
  await page.getByPlaceholder('이름', { exact: true }).fill('시간표 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Hatha Yoga')
  // Only one instructor option exists at this point: the owner who just
  // signed up. listInstructors() includes the 'owner' role precisely so a
  // brand-new studio (no invited instructor yet) can still assign itself,
  // per Task 4's class_templates_validate_instructor trigger.
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('10')
  await page.getByRole('button', { name: '시간표 추가' }).click()

  // The template row now leads with the class name and keeps the
  // recurrence rule as metadata beneath it, so the two are asserted
  // separately -- which is what this check always meant.
  await expect(page.getByText('Hatha Yoga', { exact: true })).toBeVisible()
  await expect(page.getByText(/매주 월요일 09:00/).first()).toBeVisible()
  const sessionItems = page.locator('ul').last().locator('li')
  await expect(sessionItems).toHaveCount(8)
})
