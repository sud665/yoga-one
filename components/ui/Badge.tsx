import { cx } from './utils'

// DESIGN.md `tag-chip`: a filled pastel pill for class-type/category labels.
// Retoken pass: the old 3-tag palette (tag-a/b/c, each with its own soft/
// deep text-color pairing) is replaced by DESIGN.md's 4 flat pastel tags
// (peach/mint/mustard/cream) borrowed from the Airtable demo-grid cards --
// every tag now uses the SAME text color (ink) regardless of background,
// since DESIGN.md states plainly "텍스트는 전부 ink(파스텔이라 대비 문제
// 없음)". Simpler than the old per-tag text-color table, and there are
// still zero call sites for this component anywhere in the app (grepped
// `<Badge` across app/ -- no matches), so this is a free redesign, not a
// breaking one.
export type BadgeTone = 'neutral' | 'tag-peach' | 'tag-mint' | 'tag-mustard' | 'tag-cream'

export interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border border-hairline bg-canvas text-ink',
  'tag-peach': 'bg-tag-peach text-ink',
  'tag-mint': 'bg-tag-mint text-ink',
  'tag-mustard': 'bg-tag-mustard text-ink',
  'tag-cream': 'bg-tag-cream text-ink',
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-caption',
        BADGE_TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

// DESIGN.md `status-badge`: booking/roster state as tone-tinted text
// (confirmed/full/waitlisted), a small semantic dot ahead of the text as a
// second, non-color cue for the same state. Retoken pass: the old 'full'
// tone is renamed 'danger' to match the new color token name it maps to
// (there being zero call sites yet -- see Badge above -- makes this a free
// rename, not a breaking one).
export type StatusTone = 'success' | 'danger' | 'waitlisted' | 'neutral'

export interface StatusBadgeProps {
  tone: StatusTone
  className?: string
  children: React.ReactNode
}

const STATUS_TEXT_CLASSES: Record<StatusTone, string> = {
  success: 'text-success',
  danger: 'text-danger',
  waitlisted: 'text-muted',
  neutral: 'text-muted',
}

const STATUS_DOT_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  waitlisted: 'bg-muted',
  neutral: 'bg-muted',
}

export function StatusBadge({ tone, className, children }: StatusBadgeProps) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-caption', STATUS_TEXT_CLASSES[tone], className)}>
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT_CLASSES[tone])} />
      {children}
    </span>
  )
}
