'use server'

import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { REQUIRED_AGREEMENT_IDS, type AgreementId } from '@/lib/membership-plans'

export interface RegisterMemberInput {
  fullName: string
  phone: string
  email: string
  plan: string
  termMonths: number
  startDate: string
  classes: string[]
  totalPrice: number
  agreements: Record<AgreementId, boolean>
  signatureName: string
}

// Owner's 3-step registration wizard (app/admin/roster/members/new). Unlike
// the plain "회원 초대 링크 발급" shortcut (lib/actions/invites.ts's
// createInvite), this captures a membership plan/pricing/agreement/signature
// up front and hands them to register_member as one atomic RPC call -- see
// that migration's own comment for why the invite/registration pair can't be
// two separate client-side calls. The invite code itself is generated here
// with nanoid(10), the exact call createInvite already uses, rather than in
// SQL -- an invite code grants account creation, so it stays on the same
// CSPRNG the rest of the app uses for that instead of Postgres's non-
// cryptographic random().
export async function registerMember(input: RegisterMemberInput): Promise<{ error: string } | { url: string }> {
  const fullName = input.fullName.trim()
  const phone = input.phone.trim()
  const email = input.email.trim()
  const signatureName = input.signatureName.trim()

  if (!fullName || !phone || !email) return { error: '이름과 전화번호를 입력해주세요.' }
  const missing = REQUIRED_AGREEMENT_IDS.filter((id) => !input.agreements[id])
  if (missing.length > 0) return { error: '필수 항목에 모두 동의해야 등록할 수 있습니다.' }
  if (!signatureName) return { error: '서명란에 회원 성명을 입력해주세요.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') return { error: '원장만 회원을 등록할 수 있습니다.' }

  const code = nanoid(10)

  const { error } = await supabase.rpc('register_member', {
    p_code: code,
    p_full_name: fullName,
    p_phone: phone,
    p_email: email,
    p_plan: input.plan,
    p_term_months: input.termMonths,
    p_start_date: input.startDate,
    p_classes: input.classes,
    p_total_price: input.totalPrice,
    p_agreements: input.agreements,
    p_signature_name: signatureName,
  })

  if (error) return { error: mapRegisterError(error.message) }

  revalidatePath('/admin/roster/members')
  return { url: `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${code}` }
}

function mapRegisterError(message: string): string {
  if (message.includes('missing_required_field')) return '이름, 전화번호, 이메일을 모두 입력해주세요.'
  if (message.includes('missing_signature')) return '서명란에 회원 성명을 입력해주세요.'
  if (message.includes('not_permitted')) return '원장만 회원을 등록할 수 있습니다.'
  return message
}
