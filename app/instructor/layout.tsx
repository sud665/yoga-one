// No chrome of its own: instructors have a single screen, and the bar this
// shell briefly carried existed only to hold sign-out -- which now lives at
// the end of the page content (SignOutFooter), where an occasional action
// belongs, instead of spending permanent header space.
export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <div data-role="instructor">{children}</div>
}
