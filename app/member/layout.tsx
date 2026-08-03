import { MemberNav } from './member-nav'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="member">
      <MemberNav />
      {/* pb-24 clears the fixed bottom tab bar on mobile; on md+ the nav is
          the top bar instead and nothing is overlapping the content. Same
          arrangement as app/admin/layout.tsx. */}
      <main className="pb-24 md:pb-0">{children}</main>
    </div>
  )
}
