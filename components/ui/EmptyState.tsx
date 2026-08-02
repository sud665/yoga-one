import { cx } from './utils'

// Adjustment #3: the empty-list pattern DESIGN.md never specified, for
// lists that can legitimately be empty (roster, schedule, bookings -- all
// out of scope to actually retrofit this phase, but built now so that
// follow-up phase has a real component instead of another bare "없음"
// string). Title + optional description + optional action, matching the
// "empty screen is an invitation to act" principle: say what's missing and
// give a way to fix it, don't just report absence.
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
        'flex flex-col items-center gap-2 rounded-card border border-hairline bg-soft-cloud px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div aria-hidden="true" className="mb-1 text-stone">
          {icon}
        </div>
      )}
      <p className="text-heading-md text-ink">{title}</p>
      {description && <p className="max-w-sm text-body-md text-mute">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
