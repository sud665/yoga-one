'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Notice, NoticeTarget } from '@/lib/types'

const VALID_TARGETS: NoticeTarget[] = ['all', 'member', 'instructor']

// RLS (notices: owner manages own studio notices / instructor·member reads
// targeted notices) already scopes this to the caller's studio and, for a
// non-owner, to notices actually targeted at them -- so this is a plain
// select with no server-side role branching. pin desc first, then newest
// first within each group, matching admin_notices/notice_board's "고정 공지가
// 항상 위, 그 아래는 최신순" -- no separate sort control in the design.
export async function listNotices(): Promise<Notice[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notices')
    .select('*')
    .order('pin', { ascending: false })
    .order('created_at', { ascending: false })
  return data ?? []
}

// No `.single()`: get_notice `returns public.notices` (a single composite
// row, not setof), so postgrest-js already returns an unwrapped object --
// matching bookSession/cancelBooking's documented reasoning in
// lib/actions/bookings.ts for the identical shape.
export async function getNotice(id: string): Promise<{ error: string } | { notice: Notice }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_notice', { p_id: id })
  if (error || !data) return { error: mapGetNoticeError(error?.message) }
  return { notice: data }
}

export async function createNotice(formData: FormData): Promise<{ error: string } | { success: true }> {
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const target = String(formData.get('target') ?? 'all')
  const pin = formData.get('pin') === 'on'

  if (!title || !body) return { error: '제목과 내용을 입력해주세요.' }
  if (!VALID_TARGETS.includes(target as NoticeTarget)) return { error: '대상을 다시 선택해주세요.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase.from('profiles').select('studio_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') return { error: '원장만 공지를 작성할 수 있습니다.' }

  const { error } = await supabase.from('notices').insert({
    studio_id: profile.studio_id,
    title,
    body,
    target,
    pin,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/notices')
  revalidatePath('/notices')
  return { success: true }
}

function mapGetNoticeError(message: string | undefined): string {
  if (!message) return '공지를 불러오지 못했습니다.'
  if (message.includes('notice_not_found')) return '존재하지 않는 공지입니다.'
  if (message.includes('not_permitted')) return '이 공지를 볼 수 있는 권한이 없습니다.'
  return message
}
