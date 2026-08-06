import { MemberNav } from './member-nav'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="member" className="flex h-full flex-col">
      {/* main first, nav second: in a column flex, main's flex-1 fills
          everything above the nav's own shrink-0 height, which is what
          keeps the nav visually pinned to the bottom of the app-shell frame
          while only main scrolls -- no fixed positioning, no bottom padding
          on main to compensate for an overlay. */}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <MemberNav />
    </div>
  )
}
