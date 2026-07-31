import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse, NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// We only mock the Supabase boundary (lib/supabase/middleware.ts). The real
// middleware() function, including its `redirect()` helper, runs for real.
vi.mock('@/lib/supabase/middleware', () => ({
  createMiddlewareClient: vi.fn(),
}))

function mockClient({
  user,
  profile,
}: {
  user: { id: string } | null
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

    const res = await middleware(new NextRequest('http://localhost:3000/login'))

    expect(res.cookies.get('sb-refreshed-token')?.value).toBe('refreshed-value')
  })

  it('forwards a cookie set mid-request onto a NextResponse.redirect() response (unauthenticated -> /login)', async () => {
    mockClient({ user: null, profile: null })

    const res = await middleware(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    expect(res.cookies.get('sb-refreshed-token')?.value).toBe('refreshed-value')
  })

  it('forwards a cookie set mid-request onto the onboarding redirect (authenticated, no profile)', async () => {
    mockClient({ user: { id: 'user-1' }, profile: null })

    const res = await middleware(new NextRequest('http://localhost:3000/admin'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/onboarding/studio-name')
    expect(res.cookies.get('sb-refreshed-token')?.value).toBe('refreshed-value')
  })

  it('forwards a cookie set mid-request onto the role-mismatch redirect', async () => {
    mockClient({ user: { id: 'user-1' }, profile: { role: 'member' } })

    const res = await middleware(new NextRequest('http://localhost:3000/admin'))

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

    const res = await middleware(new NextRequest('http://localhost:3000/invite/abc123'))

    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })
})
