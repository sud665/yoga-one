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

// End-of-page placement, the app-standard home for sign-out. It rode in the
// top bar of every screen at first, and that was withdrawn on feedback: an
// exit used once in a blue moon was spending permanent header space on every
// screen. Below the content, after a hairline, centered -- reachable by
// scrolling, invisible until wanted.
export function SignOutFooter({ className = '' }: { className?: string }) {
  return (
    <div className={`mt-12 flex justify-center border-t border-hairline-soft pt-8 pb-4 ${className}`}>
      <SignOutButton />
    </div>
  )
}
