import { describe, it, expect, vi, beforeEach } from 'vitest'
import { acceptInviteWithPassword } from '@/lib/actions/invites'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// acceptInviteWithPassword only touches Next.js indirectly through
// createClient() (no cookies()/redirect() calls of its own), so -- unlike
// app/auth/callback/route.ts -- it can be imported and called directly here,
// mocking just that one boundary (same idea as tests/middleware.test.ts and
// tests/auth-callback.test.ts).
//
// This suite exists instead of driving these same cases through a full
// Playwright form submission (tests/e2e/invite-rejection.spec.ts) because
// that path turned out to be unreliable for invite_expired/invite_already_used
// specifically: submitting the accept form invokes acceptInviteWithPassword
// as a Next.js Server Action, and Next bundles that action's result together
// with a fresh Server Component render of the *same* /invite/[code] route in
// one round trip (confirmed via a captured trace: a single
// `POST /invite/[code]` carrying a `Next-Action` header). Once the invite is
// genuinely expired/used, that bundled re-render sees get_invite_preview's
// `valid` flip to false and swaps in the page's generic "invalid link"
// branch, unmounting InviteAcceptForm (and its local error state) -- racing
// against, and often beating, the specific message this suite is meant to
// protect. Mocking the Supabase boundary and calling the real function
// directly removes that race and asserts the mapping deterministically.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Needed for the email-confirmation branching added in the final
// whole-branch review: when signUp() returns no session, acceptInviteWithPassword
// now persists the invite code via cookies() (same mechanism
// signInWithKakao already uses for pending_studio_name/pending_invite_code)
// instead of falling through to accept_invite. Mirrors tests/auth-callback.test.ts's
// mockCookies helper.
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

function buildFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

const validForm = () => buildFormData({ fullName: 'Test User', email: 'test@test.local', password: 'password123' })

function mockCookies() {
  const store = new Map<string, string>()
  const setSpy = vi.fn((name: string, value: string) => store.set(name, value))
  vi.mocked(cookies).mockResolvedValue({
    set: setSpy,
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return { setSpy }
}

function mockSupabase({
  signUpError,
  acceptError,
  session = {},
}: {
  signUpError?: { message: string; code?: string } | null
  acceptError?: { message: string } | null
  // Defaults to a truthy stand-in session object, matching every existing
  // signup-dependent test in this codebase, which all assume local
  // Supabase's enable_confirmations=false (immediate session). Pass `null`
  // to simulate the hosted-with-confirmations-on case.
  session?: object | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signUp = vi.fn(async () => ({ data: { session, user: {} }, error: signUpError ?? null }) as any)
  const rpc = vi.fn(async () => ({ error: acceptError ?? null }))
  const client = {
    auth: { signUp },
    rpc,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { signUp, rpc }
}

describe('acceptInviteWithPassword error mapping (Finding 1 & 2)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(cookies).mockReset()
  })

  it('maps accept_invite\'s invite_expired exception to the friendly expired-link message', async () => {
    mockSupabase({ acceptError: { message: 'invite_expired' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ error: '초대 링크가 만료되었습니다. 원장님께 재발급을 요청해주세요.' })
  })

  it('maps accept_invite\'s invite_already_used exception to the friendly already-used message', async () => {
    mockSupabase({ acceptError: { message: 'invite_already_used' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ error: '이미 사용된 초대 링크입니다. 원장님께 재발급을 요청해주세요.' })
  })

  it('maps accept_invite\'s invite_invalid exception to the friendly invalid-link message', async () => {
    mockSupabase({ acceptError: { message: 'invite_invalid' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ error: '유효하지 않은 초대 링크입니다.' })
  })

  it('maps accept_invite\'s own profile_already_exists exception to the friendly duplicate-account message', async () => {
    mockSupabase({ acceptError: { message: 'profile_already_exists' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ error: '이미 다른 계정으로 가입되어 있습니다. 로그아웃 후 다시 시도해주세요.' })
  })

  it("maps signUp's user_already_exists AuthApiError to the same duplicate-account message (Finding 1: password path)", async () => {
    mockSupabase({ signUpError: { message: 'User already registered', code: 'user_already_exists' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ error: '이미 다른 계정으로 가입되어 있습니다. 로그아웃 후 다시 시도해주세요.' })
  })

  it('falls back to a message-substring check when signUp returns no error code', async () => {
    mockSupabase({ signUpError: { message: 'User already registered' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ error: '이미 다른 계정으로 가입되어 있습니다. 로그아웃 후 다시 시도해주세요.' })
  })

  it('leaves unrelated signUp errors untranslated (not misclassified as an already-registered email)', async () => {
    mockSupabase({ signUpError: { message: 'Password should be at least 6 characters', code: 'weak_password' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ error: 'Password should be at least 6 characters' })
  })

  it('succeeds when signUp and accept_invite both succeed', async () => {
    // No mockCookies() here: with the default truthy `session`, the function
    // never enters the pending-confirmation branch, so cookies() is never
    // called on this path.
    const { signUp, rpc } = mockSupabase({})

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ success: true })
    expect(signUp).toHaveBeenCalledWith({
      email: 'test@test.local',
      password: 'password123',
      // invite_code alongside name (durability hardening on bf2a818): stashed
      // in user_metadata so middleware.ts/auth/callback can resume invite
      // acceptance even if the pending_invite_code cookie has expired or the
      // confirmation link is opened on a different device -- see the signUp
      // options.data comment in lib/actions/invites.ts.
      options: expect.objectContaining({ data: { name: 'Test User', invite_code: 'SOMECODE' } }),
    })
    expect(rpc).toHaveBeenCalledWith('accept_invite', { p_code: 'SOMECODE', p_full_name: 'Test User' })
  })
})

// Final whole-branch review, Finding 2: local Supabase CLI defaults
// enable_confirmations to false, but hosted Supabase defaults it to true. If
// the production project has it on, signUp() returns { user, session: null }
// with no error -- previously every caller here fell straight through to
// calling accept_invite anyway, which then ran as `anon` (no EXECUTE grant)
// and surfaced a raw "permission denied" instead of ever consuming the
// invite, while the invite itself stayed unconsumed.
describe('acceptInviteWithPassword email-confirmation branching (session: null)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(cookies).mockReset()
  })

  it('does not call accept_invite and reports a pending-confirmation state when signUp returns no session', async () => {
    const { rpc } = mockSupabase({ session: null })
    mockCookies()

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ pendingConfirmation: true })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('persists the invite code in a short-lived httpOnly cookie so /auth/callback can resume it later', async () => {
    mockSupabase({ session: null })
    const { setSpy } = mockCookies()

    await acceptInviteWithPassword('SOMECODE', validForm())

    expect(setSpy).toHaveBeenCalledWith('pending_invite_code', 'SOMECODE', expect.objectContaining({ httpOnly: true }))
  })

  // Durability hardening on bf2a818: the cookie above is maxAge 600 (10 min)
  // and browser-local, so it's gone whenever the confirmation email is
  // opened later than that or on a different device. signUp() must also
  // stash the code in user_metadata (device-independent, non-expiring) so
  // middleware.ts/auth/callback can fall back to it -- this is the only
  // place that data actually originates from.
  it('also stashes the invite code in user_metadata via signUp so it survives an expired or cross-device cookie', async () => {
    const { signUp } = mockSupabase({ session: null })
    mockCookies()

    await acceptInviteWithPassword('SOMECODE', validForm())

    expect(signUp).toHaveBeenCalledWith({
      email: 'test@test.local',
      password: 'password123',
      options: expect.objectContaining({ data: { name: 'Test User', invite_code: 'SOMECODE' } }),
    })
  })

  it('still calls accept_invite immediately when signUp returns a session (local/immediate-session case, unchanged)', async () => {
    // No mockCookies() here either, for the same reason as the "succeeds"
    // test above -- a truthy session never reaches the cookies() call.
    const { rpc } = mockSupabase({ session: { access_token: 'fake' } })

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ success: true })
    expect(rpc).toHaveBeenCalledWith('accept_invite', { p_code: 'SOMECODE', p_full_name: 'Test User' })
  })
})
