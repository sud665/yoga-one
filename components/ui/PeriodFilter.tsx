'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { periodLabel, shiftPeriod, type Granularity } from '@/lib/period'
import { cx } from './utils'

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'day', label: '일별' },
  { value: 'week', label: '주별' },
  { value: 'month', label: '월별' },
]

export interface PeriodFilterProps {
  granularity: Granularity
  anchor: string
  onGranularityChange: (granularity: Granularity) => void
  onAnchorChange: (anchor: string) => void
  /** Count of rows currently passing the filter, shown beside the period. */
  matchCount?: number
  className?: string
}

// 일/주/월 filter for the dated list screens, paired with usePeriodFilter.
//
// '전체' is the default and is listed first on purpose. Defaulting to a bounded
// period would hide rows the moment a screen loads, and "where did my bookings
// go" is a worse first impression than a longer list. Narrowing stays opt-in.
//
// The arrows disappear rather than disable on '전체': there is no previous or
// next of everything, and a permanently greyed control invites clicking.
export function PeriodFilter({
  granularity,
  anchor,
  onGranularityChange,
  onAnchorChange,
  matchCount,
  className,
}: PeriodFilterProps) {
  const showNav = granularity !== 'all'

  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <div
        role="group"
        aria-label="기간 단위"
        className="flex overflow-hidden rounded-button border border-hairline"
      >
        {OPTIONS.map((option) => {
          const selected = option.value === granularity
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onGranularityChange(option.value)}
              className={cx(
                'flex-1 px-3 py-2 text-caption transition-colors',
                selected ? 'bg-brand-tint text-brand-deep' : 'bg-canvas text-muted hover:text-ink'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        {showNav && (
          <button
            type="button"
            aria-label="이전 기간"
            onClick={() => onAnchorChange(shiftPeriod(anchor, granularity, -1))}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        {/* aria-live: changing the period rewrites the list below without moving
            focus, so a screen reader would otherwise get no signal that
            anything happened. */}
        <p aria-live="polite" className="text-body-strong text-ink">
          {periodLabel(anchor, granularity)}
          {matchCount !== undefined && <span className="ml-2 text-caption text-muted">{matchCount}건</span>}
        </p>

        {showNav && (
          <button
            type="button"
            aria-label="다음 기간"
            onClick={() => onAnchorChange(shiftPeriod(anchor, granularity, 1))}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  )
}
