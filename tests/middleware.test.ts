import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse, NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// We only mock the Supabase boundary (lib/supabase/middleware.ts). The real
// proxy() function, including its `redirect()` helper, runs for real.
vi.mock('@/lib/supabase/middleware', () => ({
  createMiddlewareClient: vi.fn(),
}))

function mockClient({
  user,
  profile,
}: {
  user: { id: string; user_metadata?: Record<string, unknown> } | null
  profile: { role: string } | null
}) {
  // Simulates the real setAll() closure behavior: the underlying `response`
  // is reassigned *during* a supabase call (here, inside getUser(), standing
  // in for an auto token refresh), strictly after createMiddlewareClient()
  // has already returned {supabase, getResponse} to the caller.
  let response = NextResponse.next()

  vi.mocked(createMiddlewareClient).mockImplementation(() => ({
    supabase: {
      auth: {
        getUser: vi.fn(async () => {
          response = NextResponse.next()
          response.cookies.set('sb-refreshed-token', 'refreshed-value')
          return { data: { user } }
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: profile })),
          })),
        })),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    getResponse: () => response,
  }))
}

describe('middleware cookie forwarding (Finding 1)', () => {
  beforeEach(() => {
    vi.mocked(createMiddlewareClient).mockReset()
  })

  it('forwards a cookie set mid-request on the plain getResponse() path', async () => {
    mockClient({ user: null, profile: null })

    const res = await proxy(new NextRequest('http://localhost:3000/login'))

    expect(res.cookies.get('sb-refreshed-token')?.value).toBe('refreshed-value')
  })

  it('forwards a cookie set mid-request onto a NextResponse.redirect() response (unauthenticated -> /login)', async () => {
    mockClient({ user: null, profile: null })

    const res = await proxy(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    expect(res.cookies.get('sb-refreshed-token')?.value).toBe('refreshed-value')
  })

  it('forwards a cookie set mid-request onto the onboarding redirect (authenticated, no profile)', async () => {
    mockClient({ user: { id: 'user-1' }, profile: null })

    const res = await proxy(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/onboarding/studio-name')
    expect(res.cookies.get('sb-refreshed-token')?.value).toBe('refreshed-value')
  })

  it('forwards a cookie set mid-request onto the role-mismatch redirect', async () => {
    mockClient({ user: { id: 'user-1' }, profile: { role: 'member' } })

    const res = await proxy(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/member')
    expect(res.cookies.get('sb-refreshed-token')?.value).toBe('refreshed-value')
  })
})

describe('middleware invite-flow access (Finding 2)', () => {
  beforeEach(() => {
    vi.mocked(createMiddlewareClient).mockReset()
  })

  it('lets an authenticated, profile-less user reach /invite/[code] instead of bouncing to onboarding', async () => {
    mockClient({ user: { id: 'user-1' }, profile: null })

    const res = await proxy(new NextRequest('http://localhost:3000/invite/abc123'))

    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })
})

// Final whole-branch review, Finding 2: a profile-less authenticated user
// with a pending_invite_code cookie (set by acceptInviteWithPassword/
// signInWithKakao when signUp() couldn't establish a session immediately)
// must be routed back to their invite instead of defaulting straight to
// owner onboarding, which would otherwise silently make them the OWNER of a
// brand-new studio and leave their invite unconsumed.
describe('middleware pending-invite routing before the owner-onboarding default (Finding 2)', () => {
  beforeEach(() => {
    vi.mocked(createMiddlewareClient).mockReset()
  })

  it('redirects a profile-less user with a pending invite cookie to their invite page instead of owner onboarding', async () => {
    mockClient({ user: { id: 'user-1' }, profile: null })

    const res = await proxy(
      new NextRequest('http://localhost:3000/admin', { headers: { cookie: 'pending_invite_code=SOMECODE' } })
    )

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/invite/SOMECODE')
  })

  it('still redirects a profile-less user with no pending invite cookie to owner onboarding (unchanged behavior)', async () => {
    mockClient({ user: { id: 'user-1' }, profile: null })

    const res = await proxy(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/onboarding/studio-name')
  })
})

// Durability hardening on bf2a818/Finding 2: the pending_invite_code cookie
// is maxAge 600 (10 min) and browser-local, so it's gone whenever the
// confirmation email is opened later than that or on a different device --
// both ordinary for async email. lib/actions/invites.ts now also stashes the
// invite code in user_metadata (device-independent, non-expiring) precisely
// for this case; middleware.ts must fall back to it when the cookie is
// absent instead of defaulting to owner onboarding.
describe('middleware pending-invite user_metadata fallback when the cookie has expired or is on another device', () => {
  beforeEach(() => {
    vi.mocked(createMiddlewareClient).mockReset()
  })

  it('redirects a profile-less user with no cookie but a user_metadata.invite_code to their invite page', async () => {
    mockClient({
      user: { id: 'user-1', user_metadata: { invite_code: 'METACODE' } },
      profile: null,
    })

    const res = await proxy(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/invite/METACODE')
  })

  it('prefers the cookie over user_metadata when both are present (cookie stays the fast path)', async () => {
    mockClient({
      user: { id: 'user-1', user_metadata: { invite_code: 'METACODE' } },
      profile: null,
    })

    const res = await proxy(
      new NextRequest('http://localhost:3000/admin', { headers: { cookie: 'pending_invite_code=COOKIECODE' } })
    )

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/invite/COOKIECODE')
  })

  it('still redirects to owner onboarding when neither the cookie nor user_metadata carries an invite code (unchanged behavior)', async () => {
    mockClient({
      user: { id: 'user-1', user_metadata: {} },
      profile: null,
    })

    const res = await proxy(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/onboarding/studio-name')
  })
})

// Final whole-branch review, Finding 4: an owner assigned as a session's
// instructor_id had no route to reach an attendance screen for it --
// middleware confined every owner-role profile to /admin regardless of
// instructor_id assignment. Instructor/member confinement must stay
// unchanged; only owners gain the extra allowed prefix.
describe('middleware owner-as-instructor routing (Finding 4)', () => {
  beforeEach(() => {
    vi.mocked(createMiddlewareClient).mockReset()
  })

  it('lets an owner-role profile reach /instructor instead of bouncing to /admin', async () => {
    mockClient({ user: { id: 'user-1' }, profile: { role: 'owner' } })

    const res = await proxy(new NextRequest('http://localhost:3000/instructor'))

    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })

  it('still confines an owner-role profile away from /member', async () => {
    mockClient({ user: { id: 'user-1' }, profile: { role: 'owner' } })

    const res = await proxy(new NextRequest('http://localhost:3000/member'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin')
  })

  it('still confines an instructor-role profile to /instructor (cannot reach /admin)', async () => {
    mockClient({ user: { id: 'user-1' }, profile: { role: 'instructor' } })

    const res = await proxy(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/instructor')
  })
})

describe('middleware /error page access (Task 16)', () => {
  beforeEach(() => {
    vi.mocked(createMiddlewareClient).mockReset()
  })

  it('lets an unauthenticated visitor reach /error/forbidden instead of bouncing to /login', async () => {
    mockClient({ user: null, profile: null })

    const res = await proxy(new NextRequest('http://localhost:3000/error/forbidden'))

    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })

  it('lets a role-mismatched authenticated user reach /error/forbidden instead of bouncing to their role home', async () => {
    mockClient({ user: { id: 'user-1' }, profile: { role: 'member' } })

    const res = await proxy(new NextRequest('http://localhost:3000/error/forbidden'))

    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })
})
