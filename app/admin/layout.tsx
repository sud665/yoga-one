import { AdminNav } from './admin-nav'
import { RoleBanner } from '@/components/ui/RoleBanner'

// App screen, not a responsive website: one column, always -- the desktop
// sidebar variant (this file used to arrange a flex-row on md+, AdminNav
// swapping between a sidebar and a bottom tab bar via `hidden md:flex` /
// `md:hidden`) is gone. main first, nav second: in this column flex, main's
// flex-1 fills everything above the nav's own shrink-0 height, which is
// what keeps the nav pinned to the bottom of the app-shell frame while only
// main scrolls -- no fixed positioning, no bottom padding on main to
// compensate for an overlay. Same arrangement as app/member/layout.tsx and
// app/instructor/layout.tsx.
//
// No <ul>/<li> anywhere in this file or admin-nav.tsx, deliberately:
// tests/e2e/schedule-management.spec.ts does `page.locator('ul').last()`
// against a /admin/schedule page rendered inside this same layout, and
// tests/e2e/invite-issue.spec.ts does `getByRole('listitem').first()`
// against /admin/invites -- introducing a list-semantics element here
// would risk shadowing either query. Plain <nav>/<Link> avoids the
// question entirely, matching the pattern the previous top-nav already used.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="admin" className="flex h-full flex-col">
      {/* 역할 표시줄 -- see components/ui/RoleBanner.tsx. */}
      <RoleBanner />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      <AdminNav />
    </div>
  )
}
