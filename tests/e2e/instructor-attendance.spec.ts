import { test, expect } from '@playwright/test'

// Deviation from the brief's literal Step 3 test: the brief has the OWNER's own `page`
// (role='owner') navigate directly to `/instructor` and expects to see + interact with the
// instructor UI there. That cannot pass against this app's existing, already-merged role-routing
// middleware: middleware.ts's `roleHomePath('owner')` is `/admin`, and any non-`/admin` path for
// an owner-role profile redirects to `/admin`. Confirmed both by reading middleware.ts directly
// and by tests/e2e/role-routing.spec.ts's own passing assertion ("an owner cannot access the
// instructor or member route prefixes": `page.goto('/instructor')` -> `toHaveURL(/\/admin/)`).
// Running the brief's literal test first reproduces exactly this: the owner's `page.goto('/instructor')`
// redirects to `/admin`, and the subsequent `getByText('출석 회원')` assertion times out because
// that text never renders there.
//
// The "owner can also be instructor_id" pattern (Task 4's schema, which this task's own briefing
// notes Task 11 already leaned on) is real and still exercised in this codebase -- at the
// schedule-assignment layer, listInstructors() (lib/actions/schedule.ts) still includes
// 'owner'-role profiles as valid instructorId options, and mark_attendance itself grants an
// owner-override independent of instructor_id (supabase/tests/database/attendance.test.sql
// assertion 5). But neither of those makes the owner able to browse the `/instructor` UI page --
// that page is gated purely by `profiles.role` via the routing middleware, independent of whether
// the caller happens to also be some session's instructor_id. tests/e2e/invite-accept.spec.ts
// already proves the correct path for reaching `/instructor` as a real UI actor: an owner-issued
// instructor invite, accepted via '강사로 가입하기'. This test uses that instead.
test('instructor can view booked members for their own session and mark attendance', async ({ page, browser }) => {
  const ownerEmail = `owner-attendance-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('출석 테스트 요가원')
  // { exact: true }: '이름' is otherwise a substring match of '요가원 이름' too, which trips
  // Playwright's strict-mode locator resolution (same fix as owner-signup.spec.ts /
  // invite-issue.spec.ts / schedule-management.spec.ts / member-booking.spec.ts / role-routing.spec.ts).
  await page.getByPlaceholder('이름', { exact: true }).fill('출석 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  // Issue + accept a real instructor invite (see deviation note above) instead of navigating to
  // /instructor as the owner. A dedicated browser.newContext() keeps the instructor's session
  // cookies independent of the owner's -- same reasoning as member-booking.spec.ts's
  // acceptMemberInvite: @supabase/ssr persists the session in cookies shared across every page in
  // one BrowserContext, and this test needs to act as owner, then instructor, then member, then
  // back to the owner and instructor again, all with their own live sessions.
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '강사 초대 링크 발급' }).click()
  // getByRole('link', { name: /\/invite\// }), not .first(): Task 15 added an app-wide nav
  // (app/admin/layout.tsx) with 6 <Link>s ahead of every admin page's own content, so an
  // unqualified getByRole('link').first() now resolves to the nav's own "대시보드" link instead
  // of the just-generated invite link. Filtering by the generated URL's own "/invite/" path
  // segment -- which none of the nav's Korean labels ever contain -- uniquely targets the invite
  // <a> regardless of how many nav links precede it in the DOM. Same fix applied below and in
  // invite-accept.spec.ts / member-booking.spec.ts / roster-management.spec.ts (see
  // task-15-report.md).
  const instructorInviteUrl = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(instructorInviteUrl).toBeTruthy()

  const instructorContext = await browser.newContext()
  const instructorPage = await instructorContext.newPage()
  await instructorPage.goto(instructorInviteUrl!)
  await instructorPage.getByPlaceholder('이름').fill('출석 강사')
  await instructorPage.getByPlaceholder('이메일').fill(`attendance-instructor-${Date.now()}@test.local`)
  await instructorPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await instructorPage.getByRole('button', { name: '강사로 가입하기' }).click()
  await expect(instructorPage).toHaveURL(/\/instructor/)

  // Owner assigns the new instructor -- not themselves -- to the class template. Selected by
  // label (full name) rather than option index: listInstructors() orders by full_name, and with
  // two eligible profiles now in this studio (owner + instructor), index position isn't
  // guaranteed the way it is in schedule-management.spec.ts/member-booking.spec.ts, where the
  // owner is the only option available at select-time.
  //
  // day_of_week = TODAY's weekday, not a hardcoded Monday: mark_attendance now rejects a
  // session dated in the future (QA sweep 2026-08-08, item 2 -- a class days from now can't
  // have its attendance confirmed yet), and this test books "the nearest generated session"
  // then immediately marks its attendance in the same run. Hardcoding Monday only happened to
  // work when the suite ran on a Monday; generate_sessions_for_template materializes today's
  // date itself as the first occurrence when day_of_week matches today's weekday (CLAUDE.md's
  // "counted loop" note), so this keeps the nearest booked session at today regardless of which
  // day the suite actually runs on.
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
  const todayDayOfWeek = new Date().getDay()
  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Attendance Class')
  await page.locator('select[name="instructorId"]').selectOption({ label: '출석 강사' })
  await page.locator('select[name="dayOfWeek"]').selectOption(String(todayDayOfWeek))
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('10')
  await page.getByRole('button', { name: '시간표 추가' }).click()
  // The template row now leads with the class name and keeps the
  // recurrence rule as metadata beneath it, so the two are asserted
  // separately -- which is what this check always meant.
  // Day label and time/instructor are now separate elements (the schedule
  // page groups templates by day, with the day as the group's <summary> and
  // time/instructor as the row's own metadata) -- same split already made in
  // schedule-management.spec.ts.
  await expect(page.getByText('Attendance Class', { exact: true })).toBeVisible()
  await expect(page.getByText(`매주 ${DAY_LABELS[todayDayOfWeek]}요일`)).toBeVisible()
  await expect(page.getByText(/09:00 ·/)).toBeVisible()

  // Member books the generated session.
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  // getByRole('link', { name: /\/invite\// }): see the identical comment above this test's
  // instructorInviteUrl lookup -- same nav-collision fix.
  const memberInviteUrl = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(memberInviteUrl).toBeTruthy()

  const memberContext = await browser.newContext()
  const memberPage = await memberContext.newPage()
  await memberPage.goto(memberInviteUrl!)
  await memberPage.getByPlaceholder('이름').fill('출석 회원')
  await memberPage.getByPlaceholder('이메일').fill(`attendance-member-${Date.now()}@test.local`)
  await memberPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await memberPage.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(memberPage).toHaveURL(/\/member/)
  // Signup lands on the member dashboard; the bookable session list is a tab
  // over at /member/schedule.
  await memberPage.goto('/member/schedule')
  // .first(): generate_sessions_for_template materializes 8 weekly instances up front (Task 4),
  // so 8 identical "예약하기" buttons exist -- an unqualified getByRole(...).click() trips
  // Playwright's strict-mode "resolved to 8 elements" violation (same fix as
  // member-booking.spec.ts). Which of the 8 gets booked doesn't matter here.
  await memberPage.getByRole('button', { name: '예약하기' }).first().click()
  await expect(memberPage.getByText('예약이 확정되었습니다.')).toBeVisible()

  // Instructor reloads /instructor to fetch the now-booked session fresh (the page fetches via a
  // client-side useEffect on mount, so a stale in-memory page from before the booking existed
  // would not otherwise pick it up), sees the member as 'booked', and marks attendance. This
  // exercises "bookings: instructor views own session bookings" (Task 5) directly: the instructor
  // sees a booking that belongs to a different profile (the member), not one of their own rows --
  // which is only possible because the RLS policy scopes visibility by session ownership
  // (s.instructor_id = auth.uid()), not by the row's own member_id.
  await instructorPage.goto('/instructor')
  // Raw enum removed from the roster row -- presence of the name plus the
  // marking button is what "booked" looks like now.
  await expect(instructorPage.getByText('출석 회원', { exact: true })).toBeVisible()
  await instructorPage.getByRole('button', { name: '출석' }).click()
  await expect(
    instructorPage.getByText('출석 회원', { exact: true }).locator('..').getByText('출석', { exact: true })
  ).toBeVisible()
})
