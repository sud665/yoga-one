import { test, expect } from '@playwright/test'

async function signUpOwnerAndCreateSchedule(page: import('@playwright/test').Page, studioName: string) {
  const email = `owner-booking-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`
  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill(studioName)
  // { exact: true }: '이름' is otherwise a substring match of '요가원 이름' too, which trips
  // Playwright's strict-mode locator resolution (same fix as owner-signup.spec.ts /
  // invite-issue.spec.ts / schedule-management.spec.ts / role-routing.spec.ts).
  await page.getByPlaceholder('이름', { exact: true }).fill('예약테스트 원장')
  await page.getByPlaceholder('이메일').fill(email)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Small Class')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('1')
  await page.getByRole('button', { name: '시간표 추가' }).click()
  await expect(page.getByText('월요일 09:00 · Small Class')).toBeVisible()
}

// Deviation from the brief: issues one fresh invite link per call instead of the brief
// reusing a single `inviteUrl` for both members. `accept_invite` consumes the code on
// first use (single-use, per CLAUDE.md) -- confirmed by first running the brief's literal
// version, which reused one link for both members: member2's page rendered "유효하지 않은
// 초대 링크 -- 이 링크는 만료되었거나 이미 사용되었습니다" (screenshotted in
// task-12-report.md) instead of the signup form, and the test timed out waiting for the
// '이름' placeholder that never appeared. Calling this twice (once per member) issues two
// independent codes.
async function issueMemberInviteLink(page: import('@playwright/test').Page) {
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const link = page.getByRole('link').first()
  return await link.getAttribute('href')
}

// Deviation from the brief: each member gets their own `browser.newContext()` (separate
// cookie jar) instead of the brief's `context.newPage()` (same context/cookies as the
// owner page and as each other). lib/supabase/client.ts uses @supabase/ssr's
// createBrowserClient, which persists the session in cookies specifically so
// middleware/Server Actions can read it -- and cookies are shared across every page in one
// BrowserContext, exactly like tabs in one real-browser profile. This test needs member1
// and member2 to stay independently, simultaneously authenticated (book as member1, then
// waitlist as member2, then go BACK to member1 to cancel, then back to member2 to check
// promotion) -- with a shared context, member2 signing up overwrites the shared session
// cookie, so the later `member1.goto('/member/bookings')` would silently run as whichever
// member logged in most recently, not as member1. Existing specs
// (invite-accept.spec.ts) never hit this because they only ever hand off from owner to one
// other actor and never go back to the first. Confirmed the failure mode is real by running
// the brief's literal `context.newPage()` version first (see task-12-report.md).
async function acceptMemberInvite(browser: import('@playwright/test').Browser, inviteUrl: string, name: string) {
  const memberContext = await browser.newContext()
  const p = await memberContext.newPage()
  await p.goto(inviteUrl)
  await p.getByPlaceholder('이름').fill(name)
  await p.getByPlaceholder('이메일').fill(`${name.replace(/\s/g, '')}-${Date.now()}@test.local`)
  await p.getByPlaceholder('비밀번호').fill('test-password-123')
  await p.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(p).toHaveURL(/\/member/)
  return p
}

test('member booking fills capacity, next member is waitlisted, and cancel promotes them', async ({ page, browser }) => {
  await signUpOwnerAndCreateSchedule(page, `예약 요가원 ${Date.now()}`)

  const inviteUrl1 = await issueMemberInviteLink(page)
  expect(inviteUrl1).toBeTruthy()
  const member1 = await acceptMemberInvite(browser, inviteUrl1!, 'Member One')
  // .first(): the template's day_of_week/capacity apply uniformly to every generated
  // instance, and generate_sessions_for_template (Task 4) materializes 8 weekly instances
  // up front -- so list_upcoming_sessions_for_member returns 8 rows, all "Small Class", all
  // capacity 1, all unbooked at this point. That means 8 identical "예약하기" buttons exist,
  // and an unqualified getByRole(...).click() trips Playwright's strict-mode "resolved to 8
  // elements" violation (confirmed by running the brief's literal locator first). Which of
  // the 8 gets booked doesn't matter for the scenario -- capacity is 1 on every instance --
  // as long as member2 waitlists/promotes against that same specific session, which happens
  // automatically since member2's page lists the same 8 rows in the same (date-ascending)
  // order and only the one member1 booked will show as full.
  await member1.getByRole('button', { name: '예약하기' }).first().click()
  await expect(member1.getByText('예약이 확정되었습니다.')).toBeVisible()

  const inviteUrl2 = await issueMemberInviteLink(page)
  expect(inviteUrl2).toBeTruthy()
  const member2 = await acceptMemberInvite(browser, inviteUrl2!, 'Member Two')
  await member2.getByRole('button', { name: '대기 등록' }).click()
  await expect(member2.getByText('정원이 마감되어 대기명단에 등록되었습니다.')).toBeVisible()

  await member1.goto('/member/bookings')
  await member1.getByRole('button', { name: '취소' }).click()
  await expect(member1.getByText('대기중')).toHaveCount(0)

  await member2.goto('/member')
  await expect(member2.getByText('예약완료')).toBeVisible()
})
