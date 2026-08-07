'use server'

import { createClient } from '@/lib/supabase/server'
import { kstToday } from '@/lib/date'
import { addMonths, daysBetween } from '@/lib/period'
import { PLANS } from '@/lib/membership-plans'

// Relies entirely on RLS ("profiles: view same studio", Task 2's
// current_studio_id()-based policy) to scope this select to the caller's own
// studio -- no explicit studio_id filter needed or added, same pattern as
// listInvites() in lib/actions/invites.ts and listInstructors() in
// lib/actions/schedule.ts. Unlike invites (owner-only RLS policy), any
// authenticated profile in the studio can read this, but in practice this
// action is only ever called from the owner-gated /admin/roster/* pages.
export async function listProfilesByRole(role: 'instructor' | 'member') {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('role', role).order('full_name')
  return data ?? []
}

export type MembershipStatus = 'active' | 'soon' | 'expired' | 'unregistered'

export interface MemberRosterRow {
  id: string
  fullName: string
  phone: string | null
  plan: string | null
  planLabel: string | null
  expiryDate: string | null
  daysLeft: number | null
  status: MembershipStatus
  paused: boolean
}

function membershipStatus(daysLeft: number): 'active' | 'soon' | 'expired' {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 14) return 'soon'
  return 'active'
}

// Members who registered through the plain "회원 초대 링크 발급" shortcut
// (roster-table.tsx / admin/invites) have no member_registrations row at
// all -- only someone who went through the owner's 3-step registration
// wizard (register_member) does. Those members render with status
// 'unregistered' rather than being hidden or erroring: they're still real,
// active members, they just have no membership-plan data to show.
export async function listMembersDetailed(): Promise<MemberRosterRow[]> {
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'member')
    .order('full_name')
  if (!profiles) return []

  const { data: registrations } = await supabase
    .from('member_registrations')
    .select('profile_id, plan, term_months, start_date, paused_at')
    .not('profile_id', 'is', null)

  const byProfile = new Map((registrations ?? []).filter((r) => r.profile_id).map((r) => [r.profile_id as string, r]))
  const today = kstToday()

  return profiles.map((p) => {
    const reg = byProfile.get(p.id)
    if (!reg) {
      return {
        id: p.id,
        fullName: p.full_name,
        phone: p.phone,
        plan: null,
        planLabel: null,
        expiryDate: null,
        daysLeft: null,
        status: 'unregistered',
        paused: false,
      }
    }
    const expiryDate = addMonths(reg.start_date, reg.term_months)
    const daysLeft = daysBetween(today, expiryDate)
    return {
      id: p.id,
      fullName: p.full_name,
      phone: p.phone,
      plan: reg.plan,
      planLabel: PLANS.find((pl) => pl.id === reg.plan)?.label ?? reg.plan,
      expiryDate,
      daysLeft,
      status: membershipStatus(daysLeft),
      paused: reg.paused_at !== null,
    }
  })
}

export interface MemberAttendanceEntry {
  date: string
  title: string
  status: 'attended' | 'no_show'
}

export interface MemberDetail {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  plan: string | null
  planLabel: string | null
  termMonths: number | null
  startDate: string | null
  expiryDate: string | null
  daysLeft: number | null
  status: MembershipStatus
  paused: boolean
  registrationId: string | null
  classes: string[]
  marketingConsent: boolean | null
  photoConsent: boolean | null
  recentAttendance: MemberAttendanceEntry[]
}

export async function getMemberDetail(profileId: string): Promise<MemberDetail | null> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('id', profileId)
    .eq('role', 'member')
    .maybeSingle()
  if (!profile) return null

  const { data: reg } = await supabase
    .from('member_registrations')
    .select('id, email, plan, term_months, start_date, paused_at, agreements, classes')
    .eq('profile_id', profileId)
    .maybeSingle()

  const { data: attendance } = await supabase
    .from('bookings')
    .select('status, session:class_sessions(date, template:class_templates(title))')
    .eq('member_id', profileId)
    .in('status', ['attended', 'no_show'])
    .order('created_at', { ascending: false })
    .limit(3)

  const recentAttendance: MemberAttendanceEntry[] = (attendance ?? [])
    .filter((b): b is typeof b & { session: NonNullable<typeof b.session> } => Boolean(b.session))
    .map((b) => ({
      date: b.session.date,
      title: b.session.template?.title ?? '',
      status: b.status as 'attended' | 'no_show',
    }))

  if (!reg) {
    return {
      id: profile.id,
      fullName: profile.full_name,
      phone: profile.phone,
      email: null,
      plan: null,
      planLabel: null,
      termMonths: null,
      startDate: null,
      expiryDate: null,
      daysLeft: null,
      status: 'unregistered',
      paused: false,
      registrationId: null,
      classes: [],
      marketingConsent: null,
      photoConsent: null,
      recentAttendance,
    }
  }

  const expiryDate = addMonths(reg.start_date, reg.term_months)
  const daysLeft = daysBetween(kstToday(), expiryDate)
  const agreements = (reg.agreements ?? {}) as Record<string, boolean>

  return {
    id: profile.id,
    fullName: profile.full_name,
    phone: profile.phone,
    email: reg.email,
    plan: reg.plan,
    planLabel: PLANS.find((pl) => pl.id === reg.plan)?.label ?? reg.plan,
    termMonths: reg.term_months,
    startDate: reg.start_date,
    expiryDate,
    daysLeft,
    status: membershipStatus(daysLeft),
    paused: reg.paused_at !== null,
    registrationId: reg.id,
    classes: reg.classes ?? [],
    marketingConsent: agreements.marketing ?? false,
    photoConsent: agreements.photo ?? false,
    recentAttendance,
  }
}

// 연장: pushes the expiry out by one more month, matching the design's
// single-click "연장" button (no date picker/duration input to choose a
// different length). A flat +1 month per click rather than "add their
// original term length again" -- this table has no column separate from
// term_months to remember what that original length was, so re-deriving it
// from the current (already-extended) value would compound on repeat clicks
// (3 -> 6 -> 12 instead of 3 -> 4 -> 5) -- a flat, repeatable increment is the
// simpler and more predictable choice. RLS ("member_registrations: owner
// manages own studio registrations") is what actually scopes this update to
// the caller's own studio -- there's no explicit studio_id check here beyond
// matching on registrationId, same trust boundary invites/notices already
// rely on for their own owner-gated writes.
export async function extendMembership(registrationId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: reg } = await supabase
    .from('member_registrations')
    .select('term_months')
    .eq('id', registrationId)
    .maybeSingle()
  if (!reg) return { error: '회원권 정보를 찾을 수 없습니다.' }

  const { error } = await supabase
    .from('member_registrations')
    .update({ term_months: reg.term_months + 1 })
    .eq('id', registrationId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function toggleMembershipPause(
  registrationId: string,
  paused: boolean
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('member_registrations')
    .update({ paused_at: paused ? new Date().toISOString() : null })
    .eq('id', registrationId)
  if (error) return { error: error.message }
  return { success: true }
}
