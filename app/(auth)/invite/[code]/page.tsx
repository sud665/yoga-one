import { createClient } from '@/lib/supabase/server'
import { InviteAcceptForm } from './invite-accept-form'

// Mirrors lib/actions/invites.ts's mapAcceptInviteError. Not imported from
// there because that file is 'use server' — every export from a 'use server'
// module is compiled into a public server-action reference by Next.js, which
// requires each export to be an async function, so a shared sync helper
// can't live there. Kept small and duplicated rather than pulling out a new
// shared module for four string checks.
function describeInviteError(message: string | undefined): string | null {
  if (!message) return null
  if (message.includes('invite_expired')) return '초대 링크가 만료되었습니다. 원장님께 재발급을 요청해주세요.'
  if (message.includes('invite_already_used')) return '이미 사용된 초대 링크입니다. 원장님께 재발급을 요청해주세요.'
  if (message.includes('invite_invalid')) return '유효하지 않은 초대 링크입니다.'
  if (message.includes('profile_already_exists')) return '이미 다른 계정으로 가입되어 있습니다. 로그아웃 후 다시 시도해주세요.'
  return message
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { code } = await params
  const { error: errorParam } = await searchParams
  const supabase = await createClient()
  const { data: preview } = await supabase.rpc('get_invite_preview', { p_code: code }).maybeSingle()

  if (!preview || !preview.valid) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas px-6 py-12 text-center">
        <div className="w-full max-w-sm">
          <h1 className="mb-4 text-display-lg text-ink">유효하지 않은 초대 링크</h1>
          <p className="text-body-md text-body">
            {describeInviteError(errorParam) ??
              '이 링크는 만료되었거나 이미 사용되었습니다. 원장님께 재발급을 요청해주세요.'}
          </p>
        </div>
      </div>
    )
  }

  const role = preview.role === 'instructor' ? 'instructor' : 'member'

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-display-lg text-ink">
          {preview.studio_name} — {role === 'instructor' ? '강사' : '회원'} 초대
        </h1>
        {errorParam && (
          <p role="alert" className="mb-4 text-body-md text-danger">
            {describeInviteError(errorParam)}
          </p>
        )}
        <InviteAcceptForm code={code} role={role} />
      </div>
    </div>
  )
}
