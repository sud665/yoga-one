import { signOut } from '@/lib/actions/auth'

// A form rather than an onClick handler so this stays a server component and
// works without JavaScript. `signOut` is a server action, so the form posts
// straight to it.
//
// Sign-out is a nav affordance, not a page action, so it deliberately does not
// use Button: the primary/secondary/danger variants all read louder than the
// nav links it sits beside, and DESIGN.md allows one primary per screen --
// which every screen already spends on its real action.
export function SignOutButton({ className = '' }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <button
        type="submit"
        className="text-body-strong text-muted transition-colors hover:text-ink"
      >
        로그아웃
      </button>
    </form>
  )
}
