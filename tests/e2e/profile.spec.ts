import { test, expect } from '@playwright/test'

// The 프로필 screen is the first thing in this app that writes to `profiles`.
// That table's UPDATE grant is revoked for `authenticated` on purpose
// (20260724100006 -- a blanket update surface let a caller rewrite their own
// role), so every save here has to travel through update_my_profile
// (20260803000000). A spec that only checked the toast would pass even if the
// RPC silently wrote nothing, so both tests below reload and re-read.

async function signUpOwner(page: import('@playwright/test').Page, name: string, email: string, password: string) {
  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('프로필 테스트 요가원')
  await page.getByPlaceholder('이름', { exact: true }).fill(name)
  await page.getByPlaceholder('이메일').fill(email)
  await page.getByPlaceholder('비밀번호').fill(password)
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)
}

test('editing name and phone on the profile screen persists them', async ({ page }) => {
  const email = `profile-owner-${Date.now()}@test.local`
  await signUpOwner(page, '프로필 원장', email, 'test-password-123')

  await page.goto('/admin/profile')
  // getByLabel, not getByPlaceholder: this screen is the first in the app with
  // real <label> elements, because it is the one form a user opens with the
  // fields already filled in (see components/profile/ProfileForm.tsx).
  await expect(page.getByLabel('이름')).toHaveValue('프로필 원장')

  await page.getByLabel('이름').fill('이름 바꾼 원장')
  await page.getByLabel('전화번호').fill('010-1234-5678')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('저장했습니다')).toBeVisible()

  // The reload is the point: the form keeps its own React state, so asserting
  // the inputs without one would pass on a save that never reached Postgres.
  await page.reload()
  await expect(page.getByLabel('이름')).toHaveValue('이름 바꾼 원장')
  await expect(page.getByLabel('전화번호')).toHaveValue('010-1234-5678')

  // The name is what other people in the studio see, so it has to leave this
  // screen too -- the schedule form's instructor picker lists the owner by
  // name (listInstructors includes owners, since an owner may teach).
  await page.goto('/admin/schedule')
  await expect(page.getByRole('option', { name: '이름 바꾼 원장' })).toBeAttached()
})

test('changing a password requires the current one and the new one then works', async ({ page }) => {
  const email = `profile-password-${Date.now()}@test.local`
  const oldPassword = 'test-password-123'
  const newPassword = 'brand-new-password-456'
  await signUpOwner(page, '비밀번호 원장', email, oldPassword)

  await page.goto('/admin/profile')

  // A valid session alone is enough for Supabase's updateUser({ password }),
  // which would let anyone holding an unattended studio tablet lock the real
  // owner out. changeMyPassword re-verifies first; this asserts that guard is
  // actually wired up rather than decorative.
  await page.getByLabel('현재 비밀번호').fill('wrong-password-000')
  await page.getByLabel('새 비밀번호', { exact: true }).fill(newPassword)
  await page.getByLabel('새 비밀번호 확인').fill(newPassword)
  await page.getByRole('button', { name: '비밀번호 변경' }).click()
  await expect(page.getByText('현재 비밀번호가 올바르지 않습니다.')).toBeVisible()

  await page.getByLabel('현재 비밀번호').fill(oldPassword)
  await page.getByLabel('새 비밀번호', { exact: true }).fill(newPassword)
  await page.getByLabel('새 비밀번호 확인').fill(newPassword)
  await page.getByRole('button', { name: '비밀번호 변경' }).click()
  await expect(page.getByText('비밀번호를 변경했습니다')).toBeVisible()

  // Signing out and back in with the new password is the only assertion that
  // proves the change reached Supabase Auth rather than just the toast. This
  // also covers sign-out's new home: it lives on this screen now, not in a
  // footer on every page. Scoped to <main> because the desktop admin sidebar
  // carries its own 로그아웃 -- at Playwright's 1280px viewport both are
  // rendered, and an unscoped lookup is a strict-mode violation.
  await page.locator('main').getByRole('button', { name: '로그아웃' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByPlaceholder('이메일').fill(email)
  await page.getByPlaceholder('비밀번호').fill(newPassword)
  // exact: true -- the login page also carries a 카카오로 로그인 button, which
  // a substring match would tie with.
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/\/admin/)
})
