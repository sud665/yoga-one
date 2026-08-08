'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { kstToday } from '@/lib/date'
import type { ClassSession, ClassTemplate, ProfileRole } from '@/lib/types'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export type InstructorOption = { id: string; full_name: string; role: ProfileRole }

// listInstructors intentionally includes 'owner' alongside 'instructor': Task
// 4's class_templates_validate_instructor trigger accepts either role for
// instructor_id (`v_role not in ('owner', 'instructor')` raises), so a studio
// with no instructor profiles yet (e.g. a brand-new owner who hasn't invited
// one) can still assign itself as the instructor for a template. RLS on
// profiles already scopes this select to the caller's own studio via
// current_studio_id(), so no explicit studio_id filter is needed here.
export async function listInstructors(): Promise<InstructorOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['owner', 'instructor'])
    .order('full_name')
  return data ?? []
}

// Explicit return-type annotation (not in the original brief): without it,
// TypeScript infers the return type from the function body under `next dev`
// well enough for `result?.error` to look fine, but `next build`'s stricter
// pass -- combined with this being a 'use server' export whose type crosses
// the client/server boundary -- needs the annotation for callers to reliably
// narrow with `'error' in result`. Same fix already applied in
// lib/actions/invites.ts's createInvite/acceptInviteWithPassword; this
// matches that established convention.
export async function createClassTemplate(formData: FormData): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
  if (!profile) return { error: '프로필을 찾을 수 없습니다.' }

  const { data: template, error } = await supabase
    .from('class_templates')
    .insert({
      studio_id: profile.studio_id,
      title: String(formData.get('title')),
      instructor_id: String(formData.get('instructorId')),
      day_of_week: Number(formData.get('dayOfWeek')),
      start_time: String(formData.get('startTime')),
      duration_min: Number(formData.get('durationMin')),
      capacity: Number(formData.get('capacity')),
    })
    .select()
    .single()

  if (error || !template) return { error: error?.message ?? '템플릿 생성에 실패했습니다.' }

  const { error: genError } = await supabase.rpc('generate_sessions_for_template', {
    p_template_id: template.id,
    p_weeks_ahead: 8,
  })
  if (genError) return { error: genError.message }

  revalidatePath('/admin/schedule')
  return { success: true }
}

// RLS ("class_templates: owner updates") already scopes this to the
// caller's own studio, so no manual studio_id check is needed here -- same
// division of labor as createClassTemplate. Re-running generate_sessions_for_template
// mirrors create (CLAUDE.md: materialized "8 weeks ahead on create/edit"):
// it's additive (on conflict do nothing), so this only fills in gaps a
// day_of_week change opens up -- it does NOT retroactively update capacity/
// instructor_id on sessions already materialized before the edit, since
// those columns are copied at generation time, not read live from the
// template.
export async function updateClassTemplate(
  templateId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('class_templates')
    .update({
      title: String(formData.get('title')),
      instructor_id: String(formData.get('instructorId')),
      day_of_week: Number(formData.get('dayOfWeek')),
      start_time: String(formData.get('startTime')),
      duration_min: Number(formData.get('durationMin')),
      capacity: Number(formData.get('capacity')),
    })
    .eq('id', templateId)

  if (error) return { error: error.message }

  const { error: genError } = await supabase.rpc('generate_sessions_for_template', {
    p_template_id: templateId,
    p_weeks_ahead: 8,
  })
  if (genError) return { error: genError.message }

  revalidatePath('/admin/schedule')
  return { success: true }
}

// class_sessions.template_id and bookings.session_id both cascade on
// delete (supabase/migrations/20260724100003_class_schedule.sql,
// .../20260724100004_bookings.sql) -- deleting a template silently wipes
// every one of its sessions and their bookings, no DB-level guard. This is
// the one check standing between a mis-click and quietly cancelling a
// member's already-confirmed spot, so it blocks rather than warns.
export async function deleteClassTemplate(templateId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: futureSessions } = await supabase
    .from('class_sessions')
    .select('id')
    .eq('template_id', templateId)
    .gte('date', kstToday())

  const futureSessionIds = (futureSessions ?? []).map((s) => s.id)
  if (futureSessionIds.length > 0) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('session_id', futureSessionIds)
      .in('status', ['booked', 'waitlisted'])

    if (count && count > 0) {
      return { error: '예약된 회원이 있어 삭제할 수 없습니다. 예약을 먼저 취소해주세요.' }
    }
  }

  const { error } = await supabase.from('class_templates').delete().eq('id', templateId)
  if (error) return { error: error.message }

  revalidatePath('/admin/schedule')
  return { success: true }
}

export type TemplateWithLabel = ClassTemplate & {
  dayLabel: string
  instructor: { full_name: string } | null
}

export async function listTemplatesWithUpcomingSessions(): Promise<{
  templates: TemplateWithLabel[]
  sessions: ClassSession[]
}> {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('class_templates')
    .select('*, instructor:profiles!class_templates_instructor_id_fkey(full_name)')
    .order('day_of_week')

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('*')
    .gte('date', kstToday())
    .order('date')

  return {
    // start_time is Postgres `time`, which PostgREST serializes as
    // "HH:MM:SS" (verified against the local stack: `to_json('09:00'::time)`
    // returns "09:00:00"). Slicing to 5 chars here (once, at the data layer)
    // keeps every consumer -- this page today, Task 14's instructor view
    // later -- displaying "09:00" instead of "09:00:00" without each of them
    // re-deriving the same trim.
    templates: (templates ?? []).map((t) => ({
      ...t,
      dayLabel: DAY_LABELS[t.day_of_week],
      start_time: t.start_time.slice(0, 5),
    })),
    sessions: sessions ?? [],
  }
}
