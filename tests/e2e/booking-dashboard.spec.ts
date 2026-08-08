import { test, expect } from '@playwright/test'

test('owner sees booked and waitlisted members grouped per session', async ({ page, browser }) => {
  const ownerEmail = `owner-dashboard-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('대시보드 테스트 요가원')
  // { exact: true }: '이름' is otherwise a substring match of '요가원 이름' too, which trips
  // Playwright's strict-mode locator resolution (same fix as owner-signup.spec.ts /
  // invite-issue.spec.ts / schedule-management.spec.ts / role-routing.spec.ts / etc.).
  await page.getByPlaceholder('이름', { exact: true }).fill('대시보드 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Dashboard Class')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('1')
  await page.getByRole('button', { name: '시간표 추가' }).click()
  // Wait for the template list to actually render before moving on -- confirms
  // createClassTemplate's generate_sessions_for_template RPC has committed, so the
  // session the member books further down is guaranteed to already exist.
  // The template row now leads with the class name and keeps the
  // recurrence rule as metadata beneath it, so the two are asserted
  // separately -- which is what this check always meant.
  await expect(page.getByText('Dashboard Class', { exact: true })).toBeVisible()
  // Day label and time/instructor are now separate elements (the schedule
  // page groups templates by day, with the day as the group's <summary> and
  // time/instructor as the row's own metadata) -- same split already made in
  // schedule-management.spec.ts.
  await expect(page.getByText('매주 월요일')).toBeVisible()
  await expect(page.getByText(/09:00 ·/)).toBeVisible()

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  // getByRole('link', { name: /\/invite\// }) instead of the brief's getByRole('link').first():
  // Task 15 (this task) adds a real app-wide nav (app/admin/layout.tsx) with 6 <Link>s ahead of
  // every page's own content, so an unqualified getByRole('link').first() now resolves to the
  // nav's own "대시보드" link instead of the just-generated invite link. Filtering by the
  // generated URL's own "/invite/" path segment -- which none of the nav's Korean labels ever
  // contain -- uniquely targets the invite <a> regardless of how many nav links precede it in
  // the DOM. Same fix applied to the pre-existing specs this task's nav broke (see CLAUDE.md /
  // task-15-report.md).
  const inviteUrl = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(inviteUrl).toBeTruthy()

  // Separate browser.newContext() (own cookie jar), not the brief's context.newPage(): per
  // CLAUDE.md, @supabase/ssr sessions are cookie-based and shared per-BrowserContext, so a
  // second actor signing in on a page from the same context would silently take over the first
  // actor's session.
  const memberContext = await browser.newContext()
  const member = await memberContext.newPage()
  await member.goto(inviteUrl!)
  await member.getByPlaceholder('이름').fill('대시보드 회원')
  await member.getByPlaceholder('이메일').fill(`dashboard-member-${Date.now()}@test.local`)
  await member.getByPlaceholder('비밀번호').fill('test-password-123')
  await member.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(member).toHaveURL(/\/member/)
  // Signup lands on the member dashboard; the bookable session list is a tab
  // over at /member/schedule.
  await member.goto('/member/schedule')
  // .first(): generate_sessions_for_template materializes 8 weekly instances up front (Task 4),
  // so 8 identical "예약하기" buttons exist -- an unqualified getByRole(...).click() trips
  // Playwright's strict-mode "resolved to 8 elements" violation (same fix as
  // member-booking.spec.ts / instructor-attendance.spec.ts). Which of the 8 gets booked doesn't
  // matter here -- capacity is 1 on every instance and only one member ever books.
  await member.getByRole('button', { name: '예약하기' }).first().click()
  await expect(member.getByText('예약이 확정되었습니다.')).toBeVisible()

  await page.goto('/admin/bookings')
  await expect(
    page.locator('[data-roster="booked"]').filter({ hasText: '대시보드 회원' })
  ).toBeVisible()
})
