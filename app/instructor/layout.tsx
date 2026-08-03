import { InstructorNav } from './instructor-nav'

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="instructor">
      <InstructorNav />
      <main className="pb-24 md:pb-0">{children}</main>
    </div>
  )
}
