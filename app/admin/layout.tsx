import { AdminNav } from './admin-nav'

// Sidebar conversion (this phase's approved nav change, /admin only --
// /instructor and /member keep their existing top-nav structure).
// AdminNav renders two responsive nav surfaces (a persistent sidebar for
// desktop/tablet, a fixed bottom-tab bar for mobile) that swap via
// `hidden md:flex` / `md:hidden`, never both visible at once. This shell
// just arranges the flex row (sidebar beside content) on md+ and stacks to
// a single column with bottom clearance for the fixed tab bar below it.
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
    <div data-role="admin" className="flex min-h-full flex-col md:flex-row">
      <AdminNav />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
    </div>
  )
}
