import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile) {
    return NextResponse.redirect(`${origin}/`)
  }

  const cookieStore = await cookies()
  const pendingStudioName = cookieStore.get('pending_studio_name')?.value
  const pendingInviteCode = cookieStore.get('pending_invite_code')?.value

  if (pendingStudioName) {
    cookieStore.delete('pending_studio_name')
    await supabase.rpc('create_studio_and_owner_profile', {
      p_studio_name: pendingStudioName,
      p_full_name: user.user_metadata?.name ?? '원장',
    })
    return NextResponse.redirect(`${origin}/admin`)
  }

  if (pendingInviteCode) {
    return NextResponse.redirect(`${origin}/invite/${pendingInviteCode}?completeSignup=1`)
  }

  return NextResponse.redirect(`${origin}/onboarding/studio-name`)
}
