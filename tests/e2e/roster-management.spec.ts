import { test, expect } from '@playwright/test'

test('owner can view the member roster after a member joins via invite', async ({ page, browser }) => {
  const ownerEmail = `owner-roster-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('로스터 테스트 요가원')
  // { exact: true }: '이름' is otherwise a substring match of '요가원 이름' too, which trips
  // Playwright's strict-mode locator resolution (same fix as owner-signup.spec.ts /
  // invite-issue.spec.ts / schedule-management.spec.ts / role-routing.spec.ts / etc.).
  await page.getByPlaceholder('이름', { exact: true }).fill('로스터 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/roster/members')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  // getByRole('link', { name: /\/invite\// }), not .first(): Task 15 added an app-wide nav
  // (app/admin/layout.tsx) with 6 <Link>s ahead of every admin page's own content, so an
  // unqualified getByRole('link').first() now resolves to the nav's own "대시보드" link instead
  // of the just-generated invite link. Filtering by the generated URL's own "/invite/" path
  // segment -- which none of the nav's Korean labels ever contain -- uniquely targets the invite
  // <a> regardless of how many nav links precede it in the DOM. Same fix applied twice more below
  // and in instructor-attendance.spec.ts / invite-accept.spec.ts / member-booking.spec.ts (see
  // task-15-report.md).
  const inviteUrl = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(inviteUrl).toBeTruthy()

  // Separate browser.newContext() (own cookie jar) instead of the brief's context.newPage():
  // @supabase/ssr persists the session in cookies shared across every page within one
  // BrowserContext. This test goes back to the owner's `page` after the member signs up
  // (`page.reload()` below), so a shared context would mean that reload runs as whichever
  // session signed in most recently (the member), not the owner -- the exact failure mode
  // already discovered and fixed in member-booking.spec.ts / instructor-attendance.spec.ts
  // ("this test needs member1 and member2 to stay independently, simultaneously
  // authenticated... with a shared context, member2 signing up overwrites the shared session
  // cookie"). invite-accept.spec.ts's own context.newPage() never hit this because it never
  // goes back to the owner's page afterward -- this test does, so it needs the fix.
  const memberContext = await browser.newContext()
  const memberPage = await memberContext.newPage()
  await memberPage.goto(inviteUrl!)
  await memberPage.getByPlaceholder('이름').fill('로스터 회원')
  await memberPage.getByPlaceholder('이메일').fill(`roster-member-${Date.now()}@test.local`)
  await memberPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await memberPage.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(memberPage).toHaveURL(/\/member/)

  await page.reload()
  await expect(page.getByText('로스터 회원')).toBeVisible()
})

// Not in the brief -- added per self-review requirement to verify the new listProfilesByRole
// action (and the roster pages built on it) actually scope reads to the caller's own studio.
// profiles' RLS policy ("profiles: view same studio", Task 2) is studio-scoped only (no role
// restriction, unlike invites' owner-only policy), so any regression here would leak another
// studio's instructor/member roster into the wrong owner's screen. Uses a separate
// browser.newContext() per actor throughout (not just for the "other" studio) since the test
// reloads both owner A's and owner B's pages after both instructors have signed up.
test('roster listings are isolated per studio (no cross-tenant leakage)', async ({ page, browser }) => {
  // Studio A: owner + invited instructor.
  const ownerAEmail = `owner-roster-a-${Date.now()}@test.local`
  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('로스터 A 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill('로스터 A 원장')
  await page.getByPlaceholder('이메일').fill(ownerAEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/roster/instructors')
  await page.getByRole('button', { name: '강사 초대 링크 발급' }).click()
  // getByRole('link', { name: /\/invite\// }): see the comment on inviteUrl above -- same
  // nav-collision fix.
  const inviteUrlA = await page.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(inviteUrlA).toBeTruthy()

  const instructorAContext = await browser.newContext()
  const instructorAPage = await instructorAContext.newPage()
  await instructorAPage.goto(inviteUrlA!)
  await instructorAPage.getByPlaceholder('이름').fill('스튜디오A 강사')
  await instructorAPage.getByPlaceholder('이메일').fill(`instructor-a-${Date.now()}@test.local`)
  await instructorAPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await instructorAPage.getByRole('button', { name: '강사로 가입하기' }).click()
  await expect(instructorAPage).toHaveURL(/\/instructor/)

  // Studio B: a wholly separate owner + invited instructor, own context throughout.
  const ownerBContext = await browser.newContext()
  const ownerBPage = await ownerBContext.newPage()
  const ownerBEmail = `owner-roster-b-${Date.now()}@test.local`
  await ownerBPage.goto('/signup')
  await ownerBPage.getByPlaceholder('요가원 이름').fill('로스터 B 요가원')
  await ownerBPage.getByPlaceholder('이름', { exact: true }).fill('로스터 B 원장')
  await ownerBPage.getByPlaceholder('이메일').fill(ownerBEmail)
  await ownerBPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await ownerBPage.getByRole('button', { name: '가입하기' }).click()
  await expect(ownerBPage).toHaveURL(/\/admin/)

  await ownerBPage.goto('/admin/roster/instructors')
  await ownerBPage.getByRole('button', { name: '강사 초대 링크 발급' }).click()
  // getByRole('link', { name: /\/invite\// }): see the comment on inviteUrl above -- same
  // nav-collision fix.
  const inviteUrlB = await ownerBPage.getByRole('link', { name: /\/invite\// }).getAttribute('href')
  expect(inviteUrlB).toBeTruthy()

  const instructorBContext = await browser.newContext()
  const instructorBPage = await instructorBContext.newPage()
  await instructorBPage.goto(inviteUrlB!)
  await instructorBPage.getByPlaceholder('이름').fill('스튜디오B 강사')
  await instructorBPage.getByPlaceholder('이메일').fill(`instructor-b-${Date.now()}@test.local`)
  await instructorBPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await instructorBPage.getByRole('button', { name: '강사로 가입하기' }).click()
  await expect(instructorBPage).toHaveURL(/\/instructor/)

  // Owner A's instructor roster shows only studio A's instructor, never studio B's.
  await page.reload()
  await expect(page.getByText('스튜디오A 강사')).toBeVisible()
  await expect(page.getByText('스튜디오B 강사')).not.toBeVisible()

  // And symmetrically for owner B.
  await ownerBPage.reload()
  await expect(ownerBPage.getByText('스튜디오B 강사')).toBeVisible()
  await expect(ownerBPage.getByText('스튜디오A 강사')).not.toBeVisible()
})
