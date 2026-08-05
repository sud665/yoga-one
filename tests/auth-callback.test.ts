import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/auth/callback/route'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Mirrors tests/middleware.test.ts's approach: mock only the Supabase/cookie
// boundary and run the real route handler for real. This route can't be
// exercised end-to-end in Playwright the way the password-based invite flow
// can (tests/e2e/invite-rejection.spec.ts) -- getting here for real requires
// a completed Kakao OAuth handshake, which needs a live external provider and
// isn't something this suite can drive. Mocking the boundary lets the actual
// GET() branching (the part this finding is about) run unmocked.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

function mockCookies(values: Record<string, string>) {
  const store = new Map(Object.entries(values))
  const deleteSpy = vi.fn((name: string) => store.delete(name))
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    delete: deleteSpy,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return { deleteSpy }
}

function mockSupabase({
  profile,
  userMetadata = {},
}: {
  profile: { role: string } | null
  userMetadata?: Record<string, unknown>
}) {
  const rpc = vi.fn()
  const updateUser = vi.fn(async () => ({ error: null }))
  const client = {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', user_metadata: userMetadata } } })),
      updateUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: profile })),
        })),
      })),
    })),
    rpc,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { rpc, updateUser }
}

describe('auth callback route -- Kakao-path profile_already_exists (Finding 1)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(cookies).mockReset()
  })

  it('redirects to the invite page with a profile_already_exists error when an already-registered user has a pending invite code', async () => {
    const { rpc } = mockSupabase({ profile: { role: 'member' } })
    const { deleteSpy } = mockCookies({ pending_invite_code: 'SOMECODE' })

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/invite/SOMECODE?error=profile_already_exists')
    expect(deleteSpy).toHaveBeenCalledWith('pending_invite_code')
    // The route must short-circuit on its own profile lookup rather than
    // calling accept_invite just to get the same rejection -- confirms the
    // fix doesn't route through (and depend on) the RPC to reach this state.
    expect(rpc).not.toHaveBeenCalled()
  })

  it('still redirects home when an already-registered user has no pending invite code (unchanged behavior)', async () => {
    mockSupabase({ profile: { role: 'member' } })
    mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })
})

// Final whole-branch review, Finding 2: acceptInviteWithPassword now sets the
// same pending_invite_code cookie for the password/email-confirmation path
// that signInWithKakao already set for the Kakao path -- this suite confirms
// the route's existing pendingInviteCode resume logic (built in Task 10 for
// Kakao) generically resumes accept_invite for a profile-less user regardless
// of which path set the cookie, with no changes needed to route.ts itself.
describe('auth callback route -- resumes a pending invite once a real session exists (Finding 2)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(cookies).mockReset()
  })

  it('calls accept_invite and redirects home when a profile-less authenticated user has a pending invite code', async () => {
    const { rpc } = mockSupabase({ profile: null })
    rpc.mockResolvedValue({ error: null })
    const { deleteSpy } = mockCookies({ pending_invite_code: 'SOMECODE' })

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(rpc).toHaveBeenCalledWith('accept_invite', { p_code: 'SOMECODE', p_full_name: '신규 사용자' })
    expect(deleteSpy).toHaveBeenCalledWith('pending_invite_code')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('redirects back to the invite page carrying the RPC error when accept_invite fails on resume', async () => {
    const { rpc } = mockSupabase({ profile: null })
    rpc.mockResolvedValue({ error: { message: 'invite_expired' } })
    mockCookies({ pending_invite_code: 'SOMECODE' })

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/invite/SOMECODE?error=invite_expired')
  })

  it('still redirects to owner onboarding when a profile-less user has no pending state at all (unchanged behavior)', async () => {
    const { rpc } = mockSupabase({ profile: null })
    mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(rpc).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding/studio-name')
  })
})

// Durability hardening on bf2a818/Finding 2: the pending_invite_code cookie
// is maxAge 600 (10 min) and browser-local, so it's gone whenever the
// confirmation email is opened later than that or on a different device --
// both ordinary for async email, unlike the Kakao OAuth round-trip this
// cookie mechanism was originally built for. lib/actions/invites.ts now also
// stashes the invite code in user_metadata (device-independent,
// non-expiring) precisely for this case; this route must fall back to it
// when the cookie is absent instead of defaulting to owner onboarding.
describe('auth callback route -- user_metadata.invite_code fallback when the cookie has expired or is on another device', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(cookies).mockReset()
  })

  it('calls accept_invite and redirects home when a profile-less authenticated user has no cookie but a user_metadata.invite_code', async () => {
    const { rpc } = mockSupabase({ profile: null, userMetadata: { invite_code: 'METACODE' } })
    rpc.mockResolvedValue({ error: null })
    const { deleteSpy } = mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(rpc).toHaveBeenCalledWith('accept_invite', { p_code: 'METACODE', p_full_name: '신규 사용자' })
    // Still attempted (harmless no-op when the cookie was never set) so the
    // resume branch doesn't need to know which source supplied the code.
    expect(deleteSpy).toHaveBeenCalledWith('pending_invite_code')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('prefers the cookie over user_metadata when both are present (cookie stays the fast path)', async () => {
    const { rpc } = mockSupabase({ profile: null, userMetadata: { invite_code: 'METACODE' } })
    rpc.mockResolvedValue({ error: null })
    mockCookies({ pending_invite_code: 'COOKIECODE' })

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(rpc).toHaveBeenCalledWith('accept_invite', { p_code: 'COOKIECODE', p_full_name: '신규 사용자' })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  // Finding 3 (below) clears user_metadata.invite_code once accept_invite
  // consumes it, but that clear only runs on the resume branch this fix
  // touches. It does not retroactively clean up a code that went stale some
  // other way (written before that fix shipped, or via
  // acceptInviteWithPassword's direct-RPC branch, which never reaches this
  // route -- see the comment in route.ts). This test's assertion is
  // unchanged by that fix and stands as documentation of that residual gap:
  // an already-stale user_metadata.invite_code on a profiled user still
  // misroutes here.
  it('redirects to the invite page with a profile_already_exists error when an already-registered user has no cookie but a user_metadata.invite_code', async () => {
    const { rpc } = mockSupabase({ profile: { role: 'member' }, userMetadata: { invite_code: 'METACODE' } })
    mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/invite/METACODE?error=profile_already_exists')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('still redirects to owner onboarding when a profile-less user has an empty user_metadata and no cookie (unchanged behavior)', async () => {
    const { rpc } = mockSupabase({ profile: null, userMetadata: {} })
    mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(rpc).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding/studio-name')
  })
})

// Durability hardening on 20f2ca7, Finding 3: user_metadata.invite_code is
// stashed once at signUp() and nothing ever cleared it after accept_invite
// consumed it, so it sat on the auth.users row forever. Combined with the
// fallback this suite covers above, a user who resumed their invite through
// this route and later authenticated again for an unrelated reason (e.g. a
// Kakao identity getting linked to this same already-verified email) with no
// fresh cookie would hit the `if (profile) { if (pendingInviteCode) ... }`
// branch on the stale code and get misrouted to a "profile_already_exists"
// invite-error page instead of an ordinary sign-in. Fix: clear
// user_metadata.invite_code right after accept_invite succeeds below.
describe('auth callback route -- clears user_metadata.invite_code once consumed (Finding 3)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(cookies).mockReset()
  })

  it('clears user_metadata.invite_code after accept_invite succeeds on resume', async () => {
    const { rpc, updateUser } = mockSupabase({ profile: null, userMetadata: { invite_code: 'METACODE' } })
    rpc.mockResolvedValue({ error: null })
    mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(updateUser).toHaveBeenCalledWith({ data: { invite_code: null } })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('does not clear user_metadata.invite_code when accept_invite fails on resume (nothing was actually consumed)', async () => {
    const { rpc, updateUser } = mockSupabase({ profile: null, userMetadata: { invite_code: 'METACODE' } })
    rpc.mockResolvedValue({ error: { message: 'invite_expired' } })
    mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(updateUser).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/invite/METACODE?error=invite_expired')
  })

  it('does not block the redirect when clearing user_metadata rejects outright (best-effort cleanup)', async () => {
    const { rpc, updateUser } = mockSupabase({ profile: null, userMetadata: { invite_code: 'METACODE' } })
    rpc.mockResolvedValue({ error: null })
    updateUser.mockRejectedValue(new Error('network error'))
    mockCookies({})

    const res = await GET(new Request('http://localhost:3000/auth/callback?code=fake-code'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  // Closing the loop on the bug-report scenario: once the test above clears
  // user_metadata.invite_code during resume, a later, unrelated
  // authentication with no fresh cookie sees no metadata either, which is
  // exactly the "unchanged behavior" case this suite already covers (the
  // no-cookie / no-metadata test in the very first describe block above,
  // and the empty-user_metadata test in the previous describe block) --
  // both already assert a plain `/` redirect, not a misroute. What this fix
  // does NOT cover -- an already-stale code from before this fix shipped, or
  // from acceptInviteWithPassword's other, direct-RPC branch -- is confirmed
  // and documented by the untouched test in the describe block above this
  // one ("redirects to the invite page ... when an already-registered user
  // has no cookie but a user_metadata.invite_code").
})
