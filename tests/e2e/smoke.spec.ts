import { test, expect } from '@playwright/test'

// getComputedStyle returns a background as `rgb(...)` but a custom property as
// whatever literal the stylesheet wrote, which here is a hex string. Converting
// lets the assertion below compare the two directly.
function hexToRgb(hex: string): string {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

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

  test('an authenticated screen still renders the light canvas in a dark-scheme browser', async ({ page }) => {
    const uniqueEmail = `dark-mode-${Date.now()}@test.local`

    await page.goto('/signup')
    await page.getByPlaceholder('요가원 이름').fill('다크모드 테스트 요가원')
    await page.getByPlaceholder('이름', { exact: true }).fill('다크모드 원장')
    await page.getByPlaceholder('이메일').fill(uniqueEmail)
    await page.getByPlaceholder('비밀번호').fill('test-password-123')
    await page.getByRole('button', { name: '가입하기' }).click()
    await expect(page).toHaveURL(/\/admin/)

    // Read the expected value from the token rather than hardcoding a literal.
    // This assertion used to be `rgb(255, 255, 255)` and broke the moment
    // DESIGN.md's sage pass warmed the canvas to #fbfaf7 -- a false failure,
    // since what this test actually guards is that no dark variant takes over,
    // not any one shade. Comparing against --color-canvas keeps it pinned to
    // whatever the design system currently says light mode is.
    const { body, canvas } = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      canvas: getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim(),
    }))

    expect(canvas).not.toBe('')
    expect(body).toBe(hexToRgb(canvas))
  })
})
