import { LogOut } from 'lucide-react'

import { signOut } from '@/lib/actions/auth'

// A form rather than an onClick handler so this stays a server component and
// works without JavaScript. `signOut` is a server action, so the form posts
// straight to it.
//
// Sign-out is an exit, not a page action, so it deliberately does not use
// Button: every variant reads louder than this deserves, and each screen's
// one primary is already spent on its real action.
export function SignOutButton({ className = '' }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 text-body-strong text-muted transition-colors hover:text-ink"
      >
        {/* aria-hidden: "로그아웃" beside it is already the accessible name. */}
        <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        로그아웃
      </button>
    </form>
  )
}

// There is no SignOutFooter any more. Sign-out rode in the top bar of every
// screen first, then at the bottom of every page as a SignOutFooter; both
// spent recurring space on a control used once in a blue moon. Now that every
// role has a 프로필 screen, it lives there and only there
// (components/profile/ProfileScreen.tsx), plus the admin desktop sidebar,
// which has vertical room to spare.
