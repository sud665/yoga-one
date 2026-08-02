import { SignOutButton } from '@/components/ui/SignOutButton'

// Instructors have a single screen (their own sessions), so this bar carries no
// links -- just a label and a way out. It mirrors /member's nav (DESIGN.md
// `app-nav`: canvas, hairline bottom border, 56px) so the two roles don't feel
// like different products.
export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="instructor">
      <nav className="flex h-14 items-center gap-6 border-b border-hairline bg-canvas px-6">
        <span className="text-body-strong text-ink">내 수업</span>
        <SignOutButton className="ml-auto" />
      </nav>
      {children}
    </div>
  )
}
