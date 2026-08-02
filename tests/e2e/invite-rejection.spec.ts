import { config } from 'dotenv'
config({ path: '.env.local' })

// @supabase/supabase-js's createClient() unconditionally constructs a
// RealtimeClient, which requires a WebSocket implementation to be resolvable
// at call time. Node 20 (used in this environment) has no native global
// WebSocket, so createClient() throws immediately without this polyfill --
// see tests/integration/setup.ts, which documents and applies the identical
// fix for the Vitest integration suite. This file drives fixture setup
// (issuing invites, pre-registering users) directly against Supabase from
// the Playwright test process itself, so it needs the same polyfill; it has
// no bearing on anything under test, which is exercised entirely through the
// real browser page below.
import WebSocket from 'ws'
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket
}

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Friendly message under test, copied here (not imported) so a future
// regression that changes lib/actions/invites.ts's mapAcceptInviteError (or
// app/(auth)/invite/[code]/page.tsx's describeInviteError) without updating
// the other is caught by a literal-string mismatch rather than by both sides
// silently drifting together.
const PROFILE_ALREADY_EXISTS_MESSAGE = '이미 다른 계정으로 가입되어 있습니다. 로그아웃 후 다시 시도해주세요.'

// NOTE on what this file does *not* cover: invite_expired and
// invite_already_used. Testing those through a real form submission would
// need the invite to genuinely be expired/used at the moment
// acceptInviteWithPassword's accept_invite RPC call runs -- but doing that
// via a full Playwright flow turned out to be unreliable. Submitting the
// accept form invokes acceptInviteWithPassword as a Next.js Server Action,
// and Next bundles that action's result together with a fresh Server
// Component render of the *same* /invite/[code] route in one round trip
// (confirmed via a captured trace: a single `POST /invite/[code]` carrying a
// `Next-Action` header). Once the invite is genuinely expired/used, that
// bundled re-render sees get_invite_preview's `valid` flip to false and
// swaps in the page's generic "invalid link" branch, unmounting
// InviteAcceptForm -- racing against, and often beating, the specific
// message a test would assert on. tests/accept-invite-with-password.test.ts
// covers invite_expired/invite_already_used/invite_invalid (and this same
// profile_already_exists case) by calling the real server action directly
// with a mocked Supabase client, which sidesteps that race entirely and
// asserts the mapping deterministically.

// Issues a still-valid invite directly via a service-role client (bypassing
// RLS), matching tests/integration/booking-concurrency.test.ts's fixture
// style. The UI-driven owner-signup-then-issue-link flow is already covered
// by tests/e2e/invite-issue.spec.ts; what these tests need is just a real,
// currently-valid invite row for the browser to act on.
async function issueValidInvite(role: 'member' | 'instructor' = 'member') {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: `Rejection Studio ${runId}` })
    .select()
    .single()
  if (studioError || !studio) throw studioError ?? new Error('studio creation failed')

  const { data: owner, error: ownerError } = await admin.auth.admin.createUser({
    email: `owner-rejection-${runId}@test.local`,
    password: 'test-password-123',
    email_confirm: true,
  })
  if (ownerError || !owner.user) throw ownerError ?? new Error('owner creation failed')
  await admin.from('profiles').insert({ id: owner.user.id, studio_id: studio.id, role: 'owner', full_name: 'Owner' })

  const code = `rj${nanoid(10)}`
  const { error: inviteError } = await admin.from('invites').insert({
    studio_id: studio.id,
    role,
    code,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: owner.user.id,
  })
  if (inviteError) throw inviteError

  return { admin, code }
}

test('signing up with an already-registered email shows the duplicate-account message instead of raw Supabase text', async ({
  page,
}) => {
  const { code } = await issueValidInvite()

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const existingEmail = `existing-${Date.now()}@test.local`
  const { error: createError } = await admin.auth.admin.createUser({
    email: existingEmail,
    password: 'some-other-password-123',
    email_confirm: true,
  })
  if (createError) throw createError

  await page.goto(`/invite/${code}`)
  await expect(page.getByRole('heading')).toContainText('회원 초대')

  await page.getByPlaceholder('이름').fill('중복 이메일 테스트')
  await page.getByPlaceholder('이메일').fill(existingEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '회원으로 가입하기' }).click()

  // Before the fix, this rendered Supabase's raw, untranslated
  // signUpError.message ("User already registered") instead of routing
  // through mapAcceptInviteError. Unlike invite_expired/invite_already_used
  // above, this is safe to assert through the real form submission: the
  // invite itself stays valid throughout (only the email is a duplicate), so
  // the bundled Server Component re-render still takes the same "form"
  // branch and doesn't unmount InviteAcceptForm's error state out from under
  // this assertion.
  await expect(page.locator('p[role="alert"]')).toHaveText(PROFILE_ALREADY_EXISTS_MESSAGE)
})

test('the invite page renders the duplicate-account message for a profile_already_exists error param (Kakao-path redirect target)', async ({
  page,
}) => {
  // app/auth/callback/route.ts redirects here (?error=profile_already_exists)
  // when an already-registered user completes Kakao OAuth with a pending
  // invite code -- see tests/auth-callback.test.ts for coverage of that
  // route's redirect decision itself (real Kakao OAuth can't be driven from
  // this suite). This test covers the other half of that fix: that the
  // invite page actually renders the correct friendly message for the exact
  // query param the route redirects with. No form submission happens here,
  // so there's no Server Action/refresh race to worry about.
  const { code } = await issueValidInvite()

  await page.goto(`/invite/${code}?error=profile_already_exists`)

  await expect(page.locator('p[role="alert"]')).toHaveText(PROFILE_ALREADY_EXISTS_MESSAGE)
  // The invite itself is still valid for other users -- the form should
  // still be usable, not replaced by the "invalid link" page.
  await expect(page.getByRole('button', { name: '회원으로 가입하기' })).toBeVisible()
})
