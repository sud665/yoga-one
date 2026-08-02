import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/./)
})

// Regression for the dark-mode bug fixed in app/globals.css: DESIGN.md is a
// light-only design system, but the create-next-app scaffold's
// `@media (prefers-color-scheme: dark)` block used to flip the body
// background to near-black (#0a0a0a) while authenticated screens render
// text-black headings with no bg-white of their own -- invisible in OS dark
// mode. `test.use({ colorScheme: 'dark' })` scopes a dark browser context to
// just this describe block, matching this codebase's existing single-project
// playwright.config.ts (chromium only) rather than adding a second
// full-suite project, which would double every existing spec's run time for
// a check only this one page actually needs.
test.describe('dark mode regression (DESIGN.md has no dark variant)', () => {
  test.use({ colorScheme: 'dark' })

  test('an authenticated screen still renders a white background in a dark-scheme browser', async ({ page }) => {
    const uniqueEmail = `dark-mode-${Date.now()}@test.local`

    await page.goto('/signup')
    await page.getByPlaceholder('요가원 이름').fill('다크모드 테스트 요가원')
    await page.getByPlaceholder('이름', { exact: true }).fill('다크모드 원장')
    await page.getByPlaceholder('이메일').fill(uniqueEmail)
    await page.getByPlaceholder('비밀번호').fill('test-password-123')
    await page.getByRole('button', { name: '가입하기' }).click()
    await expect(page).toHaveURL(/\/admin/)

    const backgroundColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(backgroundColor).toBe('rgb(255, 255, 255)')
  })
})
