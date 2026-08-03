import { test, expect } from '@playwright/test'

// End-to-end coverage of the design spec's §8 user journey: owner onboarding -> invite ->
// instructor/member signup -> schedule -> booking -> capacity/waitlist -> cancel ->
// auto-promotion -> attendance.
//
// This diverges from task-18-brief.md's literal code in several ways, each forced by running
// the brief's version first and confirming it doesn't match the app that Tasks 7-17 actually
// built (per this task's own instructions -- the brief predates those tasks):
//
// 1. Four independent `browser.newContext()` actors (instructor, member1, member2, plus the
//    owner's own default `page`/context), not the brief's owner-`page` + two
//    `context.newPage()` calls. @supabase/ssr sessions are cookie-based and shared
//    per-BrowserContext (CLAUDE.md), so the brief's version would have all three secondary
//    actors silently sharing -- and repeatedly overwriting -- one session. The owner keeps
//    using the plain `page` fixture rather than an explicit extra `browser.newContext()`:
//    Playwright already gives `page` its own isolated context, so a fourth explicit context
//    for the owner would just be a redundant alias for the one it already has -- every other
//    merged spec in this suite (member-booking.spec.ts, instructor-attendance.spec.ts,
//    roster-management.spec.ts, booking-dashboard.spec.ts) follows this same "page for owner,
//    newContext() for everyone else" split.
// 2. `{ exact: true }` on the owner-signup form's '이름' field (collides with '요가원 이름'
//    otherwise) -- confirmed still required by reading app/(auth)/signup/page.tsx, matching
//    owner-signup.spec.ts / schedule-management.spec.ts / invite-issue.spec.ts / etc. The
//    invite-accept form (app/(auth)/invite/[code]/invite-accept-form.tsx) has no '요가원 이름'
//    field, so its own '이름' placeholder needs no `exact` -- confirmed by reading that
//    component directly, matching every existing spec that fills it unqualified.
// 3. `getByRole('link', { name: /\/invite\// })` instead of the brief's `getByRole('link').first()`
//    to read a freshly issued invite link. app/admin/layout.tsx's nav has 6 <Link>s ahead of
//    the invites page's own content (added by Task 15, after this brief was authored), so
//    `.first()` now grabs the nav's "대시보드" link instead. Same fix as every other spec that
//    issues an invite.
// 4. The owner never visits /instructor. Task 8's role-routing middleware confines any
//    owner-role profile to /admin regardless of instructor_id assignment -- confirmed both by
//    reading middleware.ts and by tests/e2e/role-routing.spec.ts's own passing assertion
//    (`page.goto('/instructor')` -> `toHaveURL(/\/admin/)`). Task 13 hit this identical wall in
//    instructor-attendance.spec.ts and resolved it the same way this spec does: issue a real
//    instructor invite, have that account sign up and get assigned to the class template, and
//    have it -- not the owner -- mark attendance. This is a structural product gap (no UI path
//    for an owner who teaches their own class to reach an attendance screen), not a test bug;
//    it is intentionally left unfixed here and flagged for the final whole-branch review, same
//    as Task 13 already flagged it.
// 5. Step order: the instructor is invited and assigned *before* the class template is
//    created (createClassTemplate's instructorId select needs a real instructor profile to
//    pick), and member2's invite/signup happens *after* member1's booking commits, not
//    alongside it. app/member/page.tsx fetches `listUpcomingSessionsWithBookingState()` exactly
//    once, in a mount-only `useEffect` with no polling and no realtime subscription -- so if
//    member2 signed up (and thus mounted /member) before member1's booking filled the only
//    capacity-1 session, member2's page would never show a "대기 등록" button at all (that
//    session would still look open in member2's already-fetched, now-stale state) and the test
//    would hang waiting for a button that can't appear without a reload. Confirmed by reading
//    the component's fetch logic directly. member-booking.spec.ts's proven order (member1 signs
//    up and books, *then* member2's invite is issued and member2 signs up) sidesteps this by
//    construction; this spec mirrors it.
test('full journey: onboarding through attendance', async ({ page, browser }) => {
  // Longer still than playwright.config.ts's already-raised 60s. This is the
  // longest journey in the suite by a wide margin -- three signed-in actors
  // across nine steps -- and the 회원 tab split added three more full page
  // loads to it (signup lands on the dashboard, so each member navigates on
  // to /member/schedule before booking).
  test.setTimeout(90_000)

  const stamp = Date.now()

  // 1. 원장 온보딩
  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill(`풀플로우 요가원 ${stamp}`)
  await page.getByPlaceholder('이름', { exact: true }).fill('풀플로우 원장')
  await page.getByPlaceholder('이메일').fill(`owner-fullflow-${stamp}@test.local`)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  // 2. 강사 초대 발급 및 가입 (브리핑 이탈 4: 위 설명 참고 -- 원장은 /instructor에 갈 수 없으므로
  // 실제 강사 계정을 만든다. 시간표에 배정하려면 시간표 생성보다 먼저 강사가 존재해야 하므로
  // 브리핑의 원래 순서(시간표 등록 -> 초대 발급)보다 앞당긴다.)
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '강사 초대 링크 발급' }).click()
  const instructorInviteUrl = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(instructorInviteUrl).toBeTruthy()

  const instructorContext = await browser.newContext()
  const instructorPage = await instructorContext.newPage()
  await instructorPage.goto(instructorInviteUrl!)
  await instructorPage.getByPlaceholder('이름').fill('풀플로우 강사')
  await instructorPage.getByPlaceholder('이메일').fill(`fullflow-instructor-${stamp}@test.local`)
  await instructorPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await instructorPage.getByRole('button', { name: '강사로 가입하기' }).click()
  await expect(instructorPage).toHaveURL(/\/instructor/)

  // 3. 시간표 등록 (정원 1 — 대기명단 시나리오를 위해). 방금 만든 강사를 이름(label)으로 배정한다 --
  // 이 시점엔 원장/강사 두 후보가 있어 정렬 순서(index)를 신뢰할 수 없다 (instructor-attendance.spec.ts와
  // 동일한 이유).
  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Full Flow Class')
  await page.locator('select[name="instructorId"]').selectOption({ label: '풀플로우 강사' })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('1')
  await page.getByRole('button', { name: '시간표 추가' }).click()
  // The template row now leads with the class name and keeps the
  // recurrence rule as metadata beneath it, so the two are asserted
  // separately -- which is what this check always meant.
  await expect(page.getByText('Full Flow Class', { exact: true })).toBeVisible()
  await expect(page.getByText(/매주 월요일 09:00/).first()).toBeVisible()

  // 4. 회원1 초대 발급 및 가입 -> 예약 (정원 1이므로 이 예약으로 세션이 마감된다).
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const memberInviteUrl1 = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(memberInviteUrl1).toBeTruthy()

  const member1Context = await browser.newContext()
  const member1 = await member1Context.newPage()
  await member1.goto(memberInviteUrl1!)
  await member1.getByPlaceholder('이름').fill('풀플로우 회원1')
  await member1.getByPlaceholder('이메일').fill(`fullflow-member1-${stamp}@test.local`)
  await member1.getByPlaceholder('비밀번호').fill('test-password-123')
  await member1.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(member1).toHaveURL(/\/member/)
  // 가입 직후 도착지는 회원 대시보드(/member)다 -- 예약 가능한 세션 목록은
  // 회원 탭이 4개로 늘어나면서 /member/schedule로 한 단계 내려갔다.
  await member1.goto('/member/schedule')

  // .first(): generate_sessions_for_template materializes 8 weekly instances up front
  // (Task 4), so 8 identical "예약하기" buttons exist -- an unqualified getByRole(...).click()
  // trips Playwright's strict-mode "resolved to 8 elements" violation (same fix as
  // member-booking.spec.ts / instructor-attendance.spec.ts / booking-dashboard.spec.ts). Which
  // of the 8 gets booked doesn't matter -- capacity is 1 on every instance, and
  // list_upcoming_sessions_for_member orders by date ascending for every caller, so member2
  // below sees the exact same session as full.
  await member1.getByRole('button', { name: '예약하기' }).first().click()
  await expect(member1.getByText('예약이 확정되었습니다.')).toBeVisible()

  // 5. 회원2 초대 발급 및 가입 -> 대기명단. member1의 예약이 커밋된 *뒤에* member2를 가입시킨다
  // (파일 상단 이탈 5 참고) -- app/member/page.tsx는 마운트 시 한 번만 세션 목록을 가져오므로,
  // 순서가 바뀌면 member2의 최초 로드 화면엔 "대기 등록" 버튼이 아예 나타나지 않는다.
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const memberInviteUrl2 = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(memberInviteUrl2).toBeTruthy()

  const member2Context = await browser.newContext()
  const member2 = await member2Context.newPage()
  await member2.goto(memberInviteUrl2!)
  await member2.getByPlaceholder('이름').fill('풀플로우 회원2')
  await member2.getByPlaceholder('이메일').fill(`fullflow-member2-${stamp}@test.local`)
  await member2.getByPlaceholder('비밀번호').fill('test-password-123')
  await member2.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(member2).toHaveURL(/\/member/)
  await member2.goto('/member/schedule')

  await member2.getByRole('button', { name: '대기 등록' }).click()
  await expect(member2.getByText('정원이 마감되어 대기명단에 등록되었습니다.')).toBeVisible()

  // 6. 원장 대시보드에서 예약/대기 확인
  await page.goto('/admin/bookings')
  // The roster renders as labeled chip rows now; data-roster scopes the
  // lookup so multiple session cards can't make the label ambiguous.
  await expect(
    page.locator('[data-roster="booked"]').filter({ hasText: '풀플로우 회원1' })
  ).toBeVisible()
  await expect(
    page.locator('[data-roster="waitlisted"]').filter({ hasText: '풀플로우 회원2' })
  ).toBeVisible()

  // 7. member1 취소 -> member2 자동 승격
  await member1.goto('/member/bookings')
  await member1.getByRole('button', { name: '취소' }).click()
  // 다음 액터로 넘어가기 전에 취소가 서버에 실제로 반영됐는지 확인하는 대기 조건.
  // listMyBookings()는 status in ('booked','waitlisted')만 반환하므로(lib/actions/bookings.ts),
  // 취소된 예약은 새로고침 후 목록에서 완전히 사라진다 -- '취소' 버튼이 사라질 때까지 기다리면
  // cancel_booking RPC(그 안에서 원자적으로 일어나는 대기명단 승격 포함, CLAUDE.md)가 이미
  // 커밋됐음이 보장된다.
  await expect(member1.getByRole('button', { name: '취소' })).toHaveCount(0)

  await member2.goto('/member/schedule')
  await expect(member2.getByText('예약완료')).toBeVisible()

  // 8. 강사 출석 체크 (원장이 아니라 2단계에서 만든 실제 강사 계정 -- 파일 상단 이탈 4 참고).
  // 인스트럭터 페이지도 마운트 시 한 번만 불러오므로, 승격 이후 상태를 보려면 다시 goto한다
  // (instructor-attendance.spec.ts와 동일한 이유).
  await instructorPage.goto('/instructor')
  // The raw enum no longer renders beside the name; a booked student shows
  // the name with the attendance buttons still available.
  await expect(instructorPage.getByText('풀플로우 회원2')).toBeVisible()
  await instructorPage.getByRole('button', { name: '출석' }).click()
  await expect(
    instructorPage.getByText('풀플로우 회원2').locator('..').getByText('출석', { exact: true })
  ).toBeVisible()
})
