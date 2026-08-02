import { cx } from './utils'

// Adjustment #3: the loading pattern DESIGN.md never specified. Every
// async fetch in this app today (getDashboardSummary, listMyBookings,
// listSessionsWithRoster, ...) renders its initial/empty state
// indistinguishably from a real "nothing here" result -- a 0-value flashes
// before real data arrives. Skeleton exists to give that in-flight moment
// its own honest visual state instead.
//
// `bg-hairline-soft` rather than `bg-surface-soft`: surface-soft (#f8fafc)
// is nearly indistinguishable from canvas white at a glance, which is
// exactly why it works as a resting surface elsewhere -- but it reads as
// barely "there" for something that specifically needs to signal "content
// is coming, not blank by design." hairline-soft (#eeeeee) is still fully
// within the neutral palette, just visible enough to register as a shape.
export type SkeletonVariant = 'text' | 'block' | 'circle'

export interface SkeletonProps {
  variant?: SkeletonVariant
  className?: string
}

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  // Small conventional radius (Tailwind's stock --radius-xs, untouched by
  // this system's sm/md/lg reassignment) -- a text-line placeholder
  // shouldn't borrow the much rounder rounded-card meant for containers.
  text: 'h-4 w-full rounded-xs',
  // rounded-card on purpose: a block skeleton is standing in for a Card,
  // so it anticipates that shape rather than defaulting to square corners.
  block: 'h-24 w-full rounded-card',
  circle: 'h-10 w-10 rounded-full',
}

export function Skeleton({ variant = 'block', className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('motion-safe:animate-pulse bg-hairline-soft', VARIANT_CLASSES[variant], className)}
    />
  )
}
