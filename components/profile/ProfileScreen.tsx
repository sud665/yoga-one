import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CircleUser } from 'lucide-react'

import { SignOutButton } from '@/components/ui/SignOutButton'
import { getMyProfile, getMyStudioName } from '@/lib/actions/profile'

import { ProfileForm } from './ProfileForm'
import { MyMembershipCard } from './MyMembershipCard'
import { StudioForm } from './StudioForm'

// One screen, three routes (/member/profile, /instructor/profile,
// /admin/profile). The content is identical for every role -- a name, a phone
// number, a password -- so the only thing the three pages differ in is which
// role's nav shell they render inside, which is the layout's job, not this
// component's. Splitting it per role would be three copies of the same form
// drifting apart.
export async function ProfileScreen() {
  const profile = await getMyProfile()
  // Middleware already bounces a session-less request, so reaching this means
  // the auth cookie went stale between the two checks.
  if (!profile) redirect('/login')

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <CircleUser className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">프로필</h1>
      </div>

      <ProfileForm profile={profile} />

      {/* 원장만: 요가원 이름 수정 (가입 때 정한 뒤 고칠 곳이 없었다). */}
      {profile.role === 'owner' && <StudioForm initialName={(await getMyStudioName()) ?? ''} />}

      {/* 회원만: 원장/강사에게는 회원권 개념 자체가 없다. 미등록(초대 링크로만
          가입해 회원 등록 마법사를 거치지 않은) 회원에게는 카드 자체를 숨긴다
          -- MyMembershipCard가 내부에서 그 상태를 걸러낸다. */}
      {profile.role === 'member' && <MyMembershipCard />}

      {/* Sign-out's permanent home. It sat in the top bar of every screen at
          first, then at the bottom of every page; both spent recurring space
          on something used once in a blue moon. A profile screen is where a
          user already goes to deal with their account, so it belongs here and
          nowhere else. */}
      <div className="mt-10 flex justify-center border-t border-hairline-soft pt-8">
        <SignOutButton />
      </div>

      {/* No owner path: withdraw_my_account (20260805000001) explicitly
          rejects an owner, since withdrawing would orphan the whole studio
          with nobody left to manage it -- that needs a transfer/close-studio
          flow this pass doesn't build. */}
      {profile.role !== 'owner' && (
        <div className="mt-4 flex justify-center">
          <Link href={`/${profile.role}/withdraw`} className="text-caption text-muted underline">
            탈퇴하기
          </Link>
        </div>
      )}
    </div>
  )
}
