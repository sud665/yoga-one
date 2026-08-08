import { AlertCircle, AlertTriangle, Check, Clock, type LucideIcon } from 'lucide-react'

import { cx } from './utils'

// DESIGN.md `tag-chip`: a filled pastel pill for class-type/category labels.
// The 4 flat pastel tags (peach/mint/mustard/cream) borrowed from the
// Airtable demo-grid cards each use the SAME text color (ink) regardless of
// background, since DESIGN.md states plainly "텍스트는 전부 ink(파스텔이라
// 대비 문제 없음)".
//
// `neutral` (the default) is a filled surface-strong pill, not bordered --
// its only call sites are the notice screens' target label ("전체"/"회원"/
// "강사"), and the design source renders that as a flat fill, not an
// outline. `brand` is new in the "Classical" pass: the notice screens'
// "고정" (pinned) indicator uses the same brand-tint/brand-deep pair as
// everything else in the system, not a pastel tag -- DESIGN.md's Icons
// section is explicit that pin isn't a class-type label.
export type BadgeTone = 'neutral' | 'brand' | 'tag-peach' | 'tag-mint' | 'tag-mustard' | 'tag-cream'

export interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-strong text-body',
  brand: 'bg-brand-tint text-brand-deep',
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

// DESIGN.md `status-badge`: booking/roster state as a tinted pill -- tint
// background, semantic text, and an icon.
//
// Two changes from the dot-and-text version this replaces. The tint back-
// ground is what DESIGN.md specified all along and the implementation had
// drifted from; without it a status sat at the same visual weight as the
// body text around it. And the 1.5px dot is now a real icon, because a dot
// is only a *second* channel if you already know what the colors mean --
// it repeats the color rather than adding to it. A check, a clock and an
// alert triangle are legible with the color stripped out entirely, which
// is what a colorblind reader (or a screenshot in greyscale) gets.
//
// `waitlisted` is kept as its own tone rather than folded into `warning`:
// both render amber, but waiting for a spot is a queue position, not a
// caution, and Clock says that where AlertTriangle would overstate it.
export type StatusTone = 'success' | 'warning' | 'waitlisted' | 'danger' | 'neutral'

export interface StatusBadgeProps {
  tone: StatusTone
  className?: string
  children: React.ReactNode
}

const STATUS_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  waitlisted: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  neutral: 'bg-surface-strong text-body',
}

const STATUS_ICONS: Record<StatusTone, LucideIcon | null> = {
  success: Check,
  warning: AlertTriangle,
  waitlisted: Clock,
  danger: AlertCircle,
  neutral: null,
}

export function StatusBadge({ tone, className, children }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[tone]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption',
        STATUS_CLASSES[tone],
        className
      )}
    >
      {/* aria-hidden: the label beside it already names the state, so an
          accessible name here would just make screen readers say it twice. */}
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />}
      {children}
    </span>
  )
}
