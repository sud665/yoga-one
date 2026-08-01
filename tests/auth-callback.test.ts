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

function mockSupabase({ profile }: { profile: { role: string } | null }) {
  const rpc = vi.fn()
  const client = {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', user_metadata: {} } } })),
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
  return { rpc }
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
