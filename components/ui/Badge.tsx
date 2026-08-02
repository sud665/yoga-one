import { cx } from './utils'

// DESIGN.md `badge-tag`: a filled pill for class-type/category labels.
// Tag colors are intentionally restrained (DESIGN.md: "본문 텍스트나 주요
// CTA 색으로는 절대 쓰지 않는다 -- 필터 칩, 태그점 전용") -- this component
// is the one place tag-a/b/c are allowed to appear as a background.
export type BadgeTone = 'neutral' | 'tag-a' | 'tag-b' | 'tag-c'

export interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border border-hairline bg-canvas text-ink',
  'tag-a': 'bg-tag-a-soft text-tag-a-deep',
  'tag-b': 'bg-tag-b-soft text-ink',
  'tag-c': 'border border-tag-c bg-canvas text-tag-c',
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-caption-sm',
        BADGE_TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

// DESIGN.md `badge-status-text`: booking/roster state shown as colored
// text (capacity-full / confirmed / waitlisted), not a button and not
// necessarily a filled pill -- e.g. "정원 마감 시 ... {colors.full}로 '마감'
// 표시", "예약 완료 시 ... success '예약완료' 상태 텍스트만 표시(버튼
// 아님)". A small semantic dot is added ahead of the text purely as a
// second (non-color) cue for the same state, so meaning doesn't rely on
// color alone.
export type StatusTone = 'success' | 'full' | 'waitlisted' | 'neutral'

export interface StatusBadgeProps {
  tone: StatusTone
  className?: string
  children: React.ReactNode
}

const STATUS_TEXT_CLASSES: Record<StatusTone, string> = {
  success: 'text-success',
  full: 'text-full',
  waitlisted: 'text-mute',
  neutral: 'text-mute',
}

const STATUS_DOT_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success',
  full: 'bg-full',
  waitlisted: 'bg-mute',
  neutral: 'bg-stone',
}

export function StatusBadge({ tone, className, children }: StatusBadgeProps) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-caption-md', STATUS_TEXT_CLASSES[tone], className)}>
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT_CLASSES[tone])} />
      {children}
    </span>
  )
}
