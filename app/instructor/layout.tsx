import { InstructorNav } from './instructor-nav'

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="instructor" className="flex h-full flex-col">
      {/* main first, nav second -- see app/member/layout.tsx for why. */}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <InstructorNav />
    </div>
  )
}
