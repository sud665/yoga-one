import { describe, it, expect, vi, beforeEach } from 'vitest'
import { acceptInviteWithPassword } from '@/lib/actions/invites'
import { createClient } from '@/lib/supabase/server'

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

function buildFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

const validForm = () => buildFormData({ fullName: 'Test User', email: 'test@test.local', password: 'password123' })

function mockSupabase({
  signUpError,
  acceptError,
}: {
  signUpError?: { message: string; code?: string } | null
  acceptError?: { message: string } | null
}) {
  const signUp = vi.fn(async () => ({ error: signUpError ?? null }))
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
    const { signUp, rpc } = mockSupabase({})

    const result = await acceptInviteWithPassword('SOMECODE', validForm())

    expect(result).toEqual({ success: true })
    expect(signUp).toHaveBeenCalledWith({ email: 'test@test.local', password: 'password123' })
    expect(rpc).toHaveBeenCalledWith('accept_invite', { p_code: 'SOMECODE', p_full_name: 'Test User' })
  })
})
