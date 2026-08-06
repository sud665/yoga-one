import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SignOutButton } from '@/components/ui/SignOutButton'
import { getMyProfile } from '@/lib/actions/profile'

import { ProfileForm } from './ProfileForm'

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
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-heading-lg text-ink">프로필</h1>

      <ProfileForm profile={profile} />

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
