import { test, expect } from '@playwright/test'

// Updated per the final whole-branch review: an owner is now allowed into
// /instructor (not just /admin) so an owner who teaches their own classes
// (design spec: "원장이 직접 수업을 진행하는 소규모 요가원을 지원하기 위함")
// has a route to reach an attendance screen for sessions they assigned
// themselves to as instructor_id. Member confinement is unchanged -- an
// owner still cannot reach /member.
test('an owner can access the instructor route but not the member route', async ({ page }) => {
  const uniqueEmail = `owner-routing-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('라우팅 테스트 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill('라우팅 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/instructor')
  await expect(page).toHaveURL(/\/instructor/)

  await page.goto('/member')
  await expect(page).toHaveURL(/\/admin/)
})

// Closes the routing-permission gap specifically (not re-testing the RPC/RLS
// layer, which already has coverage via supabase/tests/database/attendance.test.sql
// and tests/e2e/instructor-attendance.spec.ts): an owner assigned as a
// session's instructor_id can reach /instructor end-to-end and actually mark
// attendance, not just load the page.
test('an owner assigned as a session instructor can reach /instructor and mark attendance', async ({
  page,
  browser,
}) => {
  const ownerEmail = `owner-self-instruct-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('원장강사 테스트 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill('원장강사')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  // Owner assigns themself as the instructor -- the only option available at
  // this point (no invited instructor yet), matching schedule-management.spec.ts.
  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Owner Taught Class')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('10')
  await page.getByRole('button', { name: '시간표 추가' }).click()
  await expect(page.getByText('월요일 09:00 · Owner Taught Class')).toBeVisible()

  // The routing gap under test: previously any owner-role profile was
  // confined to /admin regardless of instructor_id assignment.
  await page.goto('/instructor')
  await expect(page).toHaveURL(/\/instructor/)

  // A member books the session so there's a real booking to mark attendance for.
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  // getByRole('link', { name: /\/invite\// }), not .first(): app/admin/layout.tsx's
  // nav has several <Link>s ahead of the invites page's own content -- same
  // fix as every other spec that issues an invite (see task-15-report.md).
  const memberInviteUrl = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(memberInviteUrl).toBeTruthy()

  const memberContext = await browser.newContext()
  const memberPage = await memberContext.newPage()
  await memberPage.goto(memberInviteUrl!)
  await memberPage.getByPlaceholder('이름').fill('원장강사 회원')
  await memberPage.getByPlaceholder('이메일').fill(`self-instruct-member-${Date.now()}@test.local`)
  await memberPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await memberPage.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(memberPage).toHaveURL(/\/member/)
  await memberPage.getByRole('button', { name: '예약하기' }).first().click()
  await expect(memberPage.getByText('예약이 확정되었습니다.')).toBeVisible()

  // Owner reloads /instructor (mount-only fetch, same as every other
  // instructor/member page in this codebase) to see the now-booked session
  // and marks attendance -- as the owner, via the instructor UI.
  await page.goto('/instructor')
  await expect(page.getByText('원장강사 회원 · booked')).toBeVisible()
  await page.getByRole('button', { name: '출석' }).click()
  await expect(page.getByText('원장강사 회원 · attended')).toBeVisible()
})
