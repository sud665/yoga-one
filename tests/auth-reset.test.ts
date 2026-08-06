import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/auth/reset/route'
import { createClient } from '@/lib/supabase/server'

// Mirrors tests/auth-callback.test.ts's approach for the sibling route
// handler: mock only the Supabase boundary, run the real GET() for real.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

function mockSupabase(exchangeError: { message: string } | null = null) {
  const exchangeCodeForSession = vi.fn(async () => ({ error: exchangeError }))
  const client = { auth: { exchangeCodeForSession } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { exchangeCodeForSession }
}

describe('auth/reset route -- recovery-code exchange', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('redirects to find-password with resetError when no code is present', async () => {
    mockSupabase()
    const res = await GET(new Request('http://localhost:3000/auth/reset'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/find-password?resetError=1')
  })

  it('redirects to find-password with resetError when the exchange fails (expired/used link)', async () => {
    mockSupabase({ message: 'invalid flow state' })
    const res = await GET(new Request('http://localhost:3000/auth/reset?code=stale-code'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/find-password?resetError=1')
  })

  it('exchanges the code and redirects to reset-password on success', async () => {
    const { exchangeCodeForSession } = mockSupabase(null)
    const res = await GET(new Request('http://localhost:3000/auth/reset?code=real-code'))
    expect(exchangeCodeForSession).toHaveBeenCalledWith('real-code')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/reset-password')
  })
})
