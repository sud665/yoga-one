import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signUpOwnerWithPassword } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// signUpOwnerWithPassword only touches Next.js through the mockable
// createClient() and cookies() -- redirect('/admin') is only ever reached
// after a successful create_studio_and_owner_profile call, which none of the
// cases below exercise, so next/navigation needs no mock here. Mirrors
// tests/accept-invite-with-password.test.ts's approach for the sibling
// (invite-accept) signup path added in the same final whole-branch review.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

function buildFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

const validForm = () =>
  buildFormData({
    studioName: 'Test Studio',
    fullName: 'Test Owner',
    email: 'owner@test.local',
    password: 'password123',
  })

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
  rpcError,
  session = {},
}: {
  signUpError?: { message: string } | null
  rpcError?: { message: string } | null
  // Defaults to a truthy stand-in session, matching every existing
  // signup-dependent test/spec in this codebase (local Supabase's
  // enable_confirmations=false). Pass `null` to simulate the
  // hosted-with-confirmations-on case.
  session?: object | null
} = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signUp = vi.fn(async () => ({ data: { session, user: {} }, error: signUpError ?? null }) as any)
  const rpc = vi.fn(async () => ({ error: rpcError ?? null }))
  const client = { auth: { signUp }, rpc }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { signUp, rpc }
}

// Final whole-branch review, Finding 2: local Supabase CLI defaults
// enable_confirmations to false, but hosted Supabase defaults it to true. If
// the production project has it on, signUp() returns { user, session: null }
// with no error -- previously this path fell straight through to
// create_studio_and_owner_profile anyway, which then ran as `anon` and
// failed (recoverable here since onboarding can retry, but still a
// confusing error first).
describe('signUpOwnerWithPassword email-confirmation branching (session: null)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(cookies).mockReset()
  })

  it('does not call create_studio_and_owner_profile and reports a pending-confirmation state when signUp returns no session', async () => {
    const { rpc } = mockSupabase({ session: null })
    mockCookies()

    const result = await signUpOwnerWithPassword(validForm())

    expect(result).toEqual({ pendingConfirmation: true })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('persists the studio name in a short-lived httpOnly cookie so /auth/callback can resume it later (same mechanism as signInWithKakao)', async () => {
    mockSupabase({ session: null })
    const { setSpy } = mockCookies()

    await signUpOwnerWithPassword(validForm())

    expect(setSpy).toHaveBeenCalledWith('pending_studio_name', 'Test Studio', expect.objectContaining({ httpOnly: true }))
  })

  it('returns the raw signUp error message and never reaches the pending-confirmation branch when signUp itself fails', async () => {
    const { rpc } = mockSupabase({ signUpError: { message: 'Password should be at least 6 characters' } })
    const { setSpy } = mockCookies()

    const result = await signUpOwnerWithPassword(validForm())

    expect(result).toEqual({ error: 'Password should be at least 6 characters' })
    expect(rpc).not.toHaveBeenCalled()
    expect(setSpy).not.toHaveBeenCalled()
  })

  it('passes the typed full name through as signUp user_metadata so /auth/callback can use it on resume', async () => {
    const { signUp } = mockSupabase({ session: null })
    mockCookies()

    await signUpOwnerWithPassword(validForm())

    expect(signUp).toHaveBeenCalledWith({
      email: 'owner@test.local',
      password: 'password123',
      options: expect.objectContaining({ data: { name: 'Test Owner' } }),
    })
  })
})
