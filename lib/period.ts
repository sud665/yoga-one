// Calendar math for the 일/주/월 filters on the dated list screens.
//
// Every date here is a plain 'YYYY-MM-DD' string, the same shape
// class_sessions.date and bookings' embedded session date already have, and
// all arithmetic runs through Date.UTC/getUTC*. That is deliberate: these are
// KST calendar dates, not instants. Parsing them with `new Date('2026-08-02')`
// would produce UTC midnight and then `getDay()` would read it back in the
// host's timezone -- which for anyone west of UTC lands on the previous day
// and silently shifts every week boundary. Fixing the whole pipeline to UTC
// keeps the arithmetic in one frame and never converts.
//
// Weeks start Sunday, matching the app's existing day indexing everywhere
// else: lib/date.ts's DAY_LABELS begins 일, and class_templates.day_of_week
// is Postgres' 0=Sunday.

export type Granularity = 'all' | 'day' | 'week' | 'month'

export interface PeriodRange {
  /** inclusive 'YYYY-MM-DD', or null when the range is unbounded */
  start: string | null
  /** inclusive 'YYYY-MM-DD', or null when the range is unbounded */
  end: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function toUTC(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** The inclusive range covering `anchor` at the given granularity. */
export function periodRange(anchor: string, granularity: Granularity): PeriodRange {
  if (granularity === 'all') return { start: null, end: null }

  const ms = toUTC(anchor)
  const d = new Date(ms)

  if (granularity === 'day') return { start: anchor, end: anchor }

  if (granularity === 'week') {
    const start = ms - d.getUTCDay() * DAY_MS
    return { start: toISO(start), end: toISO(start + 6 * DAY_MS) }
  }

  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  // Day 0 of the next month is the last day of this one, which sidesteps
  // both month lengths and leap years.
  return { start: toISO(Date.UTC(y, m, 1)), end: toISO(Date.UTC(y, m + 1, 0)) }
}

/** Moves the anchor by whole periods. `delta` is signed: -1 is the previous one. */
export function shiftPeriod(anchor: string, granularity: Granularity, delta: number): string {
  if (granularity === 'all' || delta === 0) return anchor

  const ms = toUTC(anchor)
  if (granularity === 'day') return toISO(ms + delta * DAY_MS)
  if (granularity === 'week') return toISO(ms + delta * 7 * DAY_MS)

  const d = new Date(ms)
  // Anchored to the 1st so stepping from the 31st doesn't overflow into the
  // month after next (Date.UTC(y, m+1, 31) for a 30-day month rolls forward).
  return toISO(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1))
}

/** Human label for the period the anchor sits in. */
export function periodLabel(anchor: string, granularity: Granularity): string {
  if (granularity === 'all') return '전체 기간'

  const { start, end } = periodRange(anchor, granularity)
  if (!start || !end) return '전체 기간'

  const s = new Date(toUTC(start))

  if (granularity === 'day') {
    return `${s.getUTCMonth() + 1}월 ${s.getUTCDate()}일 (${WEEKDAYS[s.getUTCDay()]})`
  }
  if (granularity === 'week') {
    const e = new Date(toUTC(end))
    return `${s.getUTCMonth() + 1}월 ${s.getUTCDate()}일 – ${e.getUTCMonth() + 1}월 ${e.getUTCDate()}일`
  }
  return `${s.getUTCFullYear()}년 ${s.getUTCMonth() + 1}월`
}

/** Whether a 'YYYY-MM-DD' falls inside the range. Unbounded ends always match. */
export function isWithin(date: string, range: PeriodRange): boolean {
  if (range.start && date < range.start) return false
  if (range.end && date > range.end) return false
  return true
}
