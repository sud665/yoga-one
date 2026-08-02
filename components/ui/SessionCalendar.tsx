'use client'

import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { DayPicker, getDefaultClassNames, type DayButtonProps } from 'react-day-picker'

import { cx } from './utils'

// Month grid for picking a day on the dated screens.
//
// react-day-picker rather than a full event calendar (FullCalendar,
// react-big-calendar): what these screens need is "scan a month, pick a day",
// not drag-to-reschedule or overlapping time-grid layout. The heavyweights
// bring their own stylesheet and a whole layout engine to fight, where this
// one renders an accessible grid and hands over every class name. Sessions
// stay in the list below, where their capacity and roster already live.
//
// No stylesheet import on purpose -- every class comes from the design
// system's tokens, so the calendar can't drift from the rest of the app.

export interface SessionCalendarProps {
  /** Currently selected day, 'YYYY-MM-DD'. */
  selected: string
  onSelect: (date: string) => void
  /** Days that have at least one session, 'YYYY-MM-DD'. Marked with a dot. */
  datesWithSessions: string[]
  className?: string
}

/** 'YYYY-MM-DD' -> local Date, and back. Parsing via parts keeps these on the
 *  calendar day they name instead of shifting by the UTC offset. */
function fromISO(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toISO(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

// Module scope, not defined inside SessionCalendar. A component declared in a
// render body is a new type on every render, so React tears down and rebuilds
// the entire day grid each time -- which also drops keyboard focus mid-
// navigation. Whether a day has a session arrives through DayPicker's
// `modifiers` instead of a closure, which is what keeps this hoistable.
//
// A dot, not a count: an owner scanning a month wants to see *which* days run
// classes, and how many is a detail the list below already answers.
function DayButton({ day, modifiers, className, ...rest }: DayButtonProps) {
  const hasSession = Boolean(modifiers.hasSession)
  return (
    <button
      {...rest}
      type="button"
      className={cx(
        'relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-body-md transition-colors',
        modifiers.selected
          ? 'bg-brand-deep text-on-brand'
          : modifiers.today
            ? 'bg-brand-tint text-brand-deep'
            : 'text-ink hover:bg-surface-soft',
        modifiers.outside && 'text-muted opacity-50',
        className
      )}
    >
      {day.date.getDate()}
      {hasSession && (
        <span
          aria-hidden="true"
          className={cx('absolute bottom-1 h-1 w-1 rounded-full', modifiers.selected ? 'bg-on-brand' : 'bg-brand')}
        />
      )}
    </button>
  )
}

const COMPONENTS = {
  DayButton,
  // lucide chevrons so the calendar's arrows match every other arrow in the
  // app instead of shipping react-day-picker's own SVGs.
  Chevron: ({ orientation }: { orientation?: 'left' | 'right' | 'up' | 'down' }) =>
    orientation === 'left' ? (
      <ChevronLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
    ) : (
      <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
    ),
}

export function SessionCalendar({ selected, onSelect, datesWithSessions, className }: SessionCalendarProps) {
  const defaults = getDefaultClassNames()
  const selectedDate = useMemo(() => fromISO(selected), [selected])
  // Memoized so the array identity is stable across renders -- DayPicker
  // re-derives its modifier map whenever this changes.
  const sessionDays = useMemo(() => datesWithSessions.map(fromISO), [datesWithSessions])

  return (
    <DayPicker
      mode="single"
      required
      locale={ko}
      // Sunday-first, matching DAY_LABELS and Postgres' day_of_week everywhere
      // else in this app.
      weekStartsOn={0}
      selected={selectedDate}
      onSelect={(date) => date && onSelect(toISO(date))}
      defaultMonth={selectedDate}
      showOutsideDays
      modifiers={{ hasSession: sessionDays }}
      components={COMPONENTS}
      className={className}
      classNames={{
        root: cx('w-fit rounded-card border border-hairline bg-canvas p-4', defaults.root),
        months: cx('relative flex flex-col', defaults.months),
        month: cx('flex w-full flex-col gap-2', defaults.month),
        nav: cx('absolute inset-x-0 top-0 flex items-center justify-between', defaults.nav),
        button_previous: cx(
          'rounded-full p-1.5 text-muted hover:bg-surface-soft hover:text-ink',
          defaults.button_previous
        ),
        button_next: cx('rounded-full p-1.5 text-muted hover:bg-surface-soft hover:text-ink', defaults.button_next),
        month_caption: cx('flex h-8 items-center justify-center', defaults.month_caption),
        caption_label: cx('text-body-strong text-ink', defaults.caption_label),
        weekdays: cx('flex', defaults.weekdays),
        weekday: cx('w-9 text-caption text-muted', defaults.weekday),
        week: cx('mt-1 flex', defaults.week),
        day: cx('p-0', defaults.day),
      }}
    />
  )
}
