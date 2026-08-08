import { test, expect } from '@playwright/test'

test('an instructor can sign up via an owner-issued invite link', async ({ page, browser }) => {
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
  // getByRole('link', { name: /\/invite\// }), not .first(): Task 15 added an app-wide nav
  // (app/admin/layout.tsx) with 6 <Link>s ahead of every admin page's own content, so an
  // unqualified getByRole('link').first() now resolves to the nav's own "대시보드" link instead
  // of the just-generated invite link. Filtering by the generated URL's own "/invite/" path
  // segment -- which none of the nav's Korean labels ever contain -- uniquely targets the invite
  // <a> regardless of how many nav links precede it in the DOM. Same fix applied everywhere else
  // this pattern appears (instructor-attendance.spec.ts, member-booking.spec.ts,
  // roster-management.spec.ts, booking-dashboard.spec.ts) -- see task-15-report.md.
  const link = page.getByRole('link', { name: /\/invite\// })
  const inviteUrl = await link.getAttribute('href')
  expect(inviteUrl).toBeTruthy()

  // browser.newContext(), not context.newPage(): @supabase/ssr sessions are
  // cookie-based and shared per-BrowserContext (CLAUDE.md), so a shared
  // context here would carry the owner's own session cookie onto this
  // request. That used to be harmless in this particular test (nothing here
  // ever goes back to the owner's `page` afterward), but proxy.ts now
  // redirects an already-authenticated, already-onboarded user away from
  // /invite/* entirely (QA sweep 2026-08-08, item 11) -- with a shared
  // context this navigation would resolve to the owner's own /admin
  // dashboard instead of the invite/accept form. A dedicated context is both
  // the pre-existing established convention and now load-bearing.
  const instructorContext = await browser.newContext()
  const instructorPage = await instructorContext.newPage()
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
