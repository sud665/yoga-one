import { cx } from './utils'

// The empty-list pattern DESIGN.md's component table never specified in
// detail beyond a color/rounded/border triple -- this phase is the first to
// actually wire it into real pages (roster, schedule, invites, bookings)
// for lists that can legitimately render zero rows, replacing a bare
// (absent) "없음" string with a real empty state. Title + optional
// description + optional action, matching the "empty screen is an
// invitation to act" principle: say what's missing and give a way to fix
// it, don't just report absence.
export interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center gap-2 rounded-card border border-hairline bg-surface-soft px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div aria-hidden="true" className="mb-1 text-muted">
          {icon}
        </div>
      )}
      <p className="text-heading-md text-ink">{title}</p>
      {description && <p className="max-w-sm text-body-md text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
