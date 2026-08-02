import { config } from 'dotenv'
config({ path: '.env.local' })

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Same publishable-then-legacy-anon fallback as lib/supabase/env.ts. Spelled
// out rather than imported because this file loads .env.local itself, before
// any app module is pulled in.
const ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Unique per run so `npm run test:integration` can be re-run without an
// intervening `npx supabase db reset`. The emails below used to be hardcoded
// fixed addresses -- a second run against the same (non-reset) database hit
// admin.auth.admin.createUser's unique-email constraint and failed at
// beforeAll, a confusing failure unrelated to what this test actually checks.
// Nothing else this suite creates (studios/class_templates/class_sessions
// rows) has a uniqueness constraint that a repeat run would trip over -- see
// their migrations -- so suffixing just the emails is sufficient.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// admin: 서비스 롤 키로 RLS를 우회해 테스트 픽스처(스튜디오/프로필)를 만드는 전용 클라이언트.
// 실제 예약 호출은 각 회원의 anon-key + 로그인 세션 클라이언트로 해야 RLS/RPC 권한 검사가
// 실제 프로덕션과 동일한 경로를 타는지 검증할 수 있다.
async function createAuthedClient(admin: SupabaseClient, email: string): Promise<{ client: SupabaseClient; userId: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  })
  if (error || !data.user) throw error ?? new Error('user creation failed')

  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: 'test-password-123' })
  if (signInError) throw signInError

  return { client, userId: data.user.id }
}

describe('book_session concurrency', () => {
  let admin: SupabaseClient
  let studioId: string
  let ownerUserId: string
  let sessionId: string
  let member1: { client: SupabaseClient; userId: string }
  let member2: { client: SupabaseClient; userId: string }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: studio } = await admin.from('studios').insert({ name: 'Concurrency Studio' }).select().single()
    studioId = studio!.id

    // Checked explicitly (unlike a bare `owner!.user!.id`) so a transient
    // GoTrue error here (e.g. a 504 under local-stack CPU contention from
    // the analytics/Logflare container -- observed in practice, unrelated
    // to anything this suite tests) surfaces as its own real error message
    // instead of a confusing "Cannot read properties of null" a run or two
    // later.
    const { data: owner, error: ownerError } = await admin.auth.admin.createUser({
      email: `owner-concurrency-${RUN_ID}@test.local`,
      password: 'test-password-123',
      email_confirm: true,
    })
    if (ownerError || !owner.user) throw ownerError ?? new Error('owner user creation failed')
    ownerUserId = owner.user.id
    await admin.from('profiles').insert({ id: ownerUserId, studio_id: studioId, role: 'owner', full_name: 'Owner' })

    member1 = await createAuthedClient(admin, `member1-concurrency-${RUN_ID}@test.local`)
    member2 = await createAuthedClient(admin, `member2-concurrency-${RUN_ID}@test.local`)
    await admin.from('profiles').insert({ id: member1.userId, studio_id: studioId, role: 'member', full_name: 'Member 1' })
    await admin.from('profiles').insert({ id: member2.userId, studio_id: studioId, role: 'member', full_name: 'Member 2' })

    const { data: template } = await admin
      .from('class_templates')
      .insert({
        studio_id: studioId,
        title: 'Race Class',
        instructor_id: ownerUserId,
        day_of_week: 1,
        start_time: '09:00',
        duration_min: 60,
        capacity: 1,
      })
      .select()
      .single()

    const { data: session } = await admin
      .from('class_sessions')
      .insert({
        template_id: template!.id,
        studio_id: studioId,
        date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        instructor_id: ownerUserId,
        capacity: 1,
      })
      .select()
      .single()

    sessionId = session!.id
  })

  it('allows exactly one of two simultaneous bookers into a capacity-1 session', async () => {
    const [result1, result2] = await Promise.all([
      member1.client.rpc('book_session', { p_session_id: sessionId }),
      member2.client.rpc('book_session', { p_session_id: sessionId }),
    ])

    const statuses = [result1.data?.status, result2.data?.status].sort()
    expect(statuses).toEqual(['booked', 'waitlisted'])
  })

  // Final whole-branch review: cancel_booking used to lock the *booking* row
  // first, then class_sessions, then (when promoting) the waitlist head --
  // the reverse of book_session's class_sessions-first order. Two concurrent
  // cancel_booking calls on the same session -- one cancelling the 'booked'
  // row (which then reaches for the waitlist head), another cancelling that
  // exact waitlisted row -- could each end up holding the lock the other
  // needed next, a genuine Postgres deadlock (reproduced live before the
  // fix). This needs a dedicated, fresh session (not the shared `sessionId`
  // above, which the previous test already books out) so the two starting
  // bookings here are deterministically 'booked'/'waitlisted'.
  it('two concurrent cancellations on the same session (one booked, one waitlisted) do not deadlock', async () => {
    const { data: template } = await admin
      .from('class_templates')
      .insert({
        studio_id: studioId,
        title: 'Cancel Race Class',
        instructor_id: ownerUserId,
        day_of_week: 2,
        start_time: '10:00',
        duration_min: 60,
        capacity: 1,
      })
      .select()
      .single()

    const { data: session } = await admin
      .from('class_sessions')
      .insert({
        template_id: template!.id,
        studio_id: studioId,
        date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        instructor_id: ownerUserId,
        capacity: 1,
      })
      .select()
      .single()

    const cancelSessionId = session!.id

    const booking1 = await member1.client.rpc('book_session', { p_session_id: cancelSessionId })
    const booking2 = await member2.client.rpc('book_session', { p_session_id: cancelSessionId })
    expect(booking1.error).toBeNull()
    expect(booking2.error).toBeNull()
    expect([booking1.data?.status, booking2.data?.status].sort()).toEqual(['booked', 'waitlisted'])

    // Cancel whichever role ('booked' vs 'waitlisted') each member actually
    // ended up with, rather than assuming member1 always won the race above
    // -- book_session's own capacity race means either member could have
    // been first.
    const bookedBooking = booking1.data?.status === 'booked' ? booking1.data : booking2.data
    const waitlistedBooking = booking1.data?.status === 'waitlisted' ? booking1.data : booking2.data
    const bookedClient = booking1.data?.status === 'booked' ? member1.client : member2.client
    const waitlistedClient = booking1.data?.status === 'waitlisted' ? member1.client : member2.client

    const [cancelBooked, cancelWaitlisted] = await Promise.all([
      bookedClient.rpc('cancel_booking', { p_booking_id: bookedBooking!.id }),
      waitlistedClient.rpc('cancel_booking', { p_booking_id: waitlistedBooking!.id }),
    ])

    // Before the fix, one of these two would fail with a Postgres deadlock
    // error (SQLSTATE 40P01) instead of both cleanly cancelling.
    expect(cancelBooked.error).toBeNull()
    expect(cancelWaitlisted.error).toBeNull()
  })
})
