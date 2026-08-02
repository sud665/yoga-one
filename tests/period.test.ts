import { describe, it, expect } from 'vitest'

import { isWithin, periodLabel, periodRange, shiftPeriod } from '@/lib/period'

// The cases here are the ones that actually break date code: week boundaries
// either side of Sunday, month lengths, leap years, year rollover, and the
// month-step overflow that bites when the anchor is a day number the next
// month doesn't have.

describe('periodRange', () => {
  it('returns the day itself for day granularity', () => {
    expect(periodRange('2026-08-02', 'day')).toEqual({ start: '2026-08-02', end: '2026-08-02' })
  })

  it('starts weeks on Sunday, matching DAY_LABELS and day_of_week', () => {
    // 2026-08-02 is a Sunday, so it is its own week start.
    expect(periodRange('2026-08-02', 'week')).toEqual({ start: '2026-08-02', end: '2026-08-08' })
    // ...and the Saturday after belongs to that same week.
    expect(periodRange('2026-08-08', 'week')).toEqual({ start: '2026-08-02', end: '2026-08-08' })
    // The next day starts a new one.
    expect(periodRange('2026-08-09', 'week')).toEqual({ start: '2026-08-09', end: '2026-08-15' })
  })

  it('spans weeks across a month boundary', () => {
    // 2026-09-01 is a Tuesday; its week reaches back into August.
    expect(periodRange('2026-09-01', 'week')).toEqual({ start: '2026-08-30', end: '2026-09-05' })
  })

  it('covers the whole month regardless of length', () => {
    expect(periodRange('2026-08-15', 'month')).toEqual({ start: '2026-08-01', end: '2026-08-31' })
    expect(periodRange('2026-09-15', 'month')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(periodRange('2026-02-10', 'month')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    // 2028 is a leap year.
    expect(periodRange('2028-02-10', 'month')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })

  it('is unbounded for "all"', () => {
    expect(periodRange('2026-08-02', 'all')).toEqual({ start: null, end: null })
  })
})

describe('shiftPeriod', () => {
  it('steps days and weeks', () => {
    expect(shiftPeriod('2026-08-02', 'day', 1)).toBe('2026-08-03')
    expect(shiftPeriod('2026-08-02', 'day', -1)).toBe('2026-08-01')
    expect(shiftPeriod('2026-08-02', 'week', 1)).toBe('2026-08-09')
    expect(shiftPeriod('2026-08-02', 'week', -1)).toBe('2026-07-26')
  })

  it('steps months without overflowing past a short month', () => {
    // The naive version (Date.UTC(y, m + 1, 31) for a 30-day September)
    // rolls into October and skips September entirely.
    expect(periodRange(shiftPeriod('2026-08-31', 'month', 1), 'month')).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
    })
  })

  it('crosses year boundaries', () => {
    expect(shiftPeriod('2026-12-15', 'month', 1).slice(0, 7)).toBe('2027-01')
    expect(shiftPeriod('2026-01-01', 'day', -1)).toBe('2025-12-31')
  })

  it('is a no-op for "all"', () => {
    expect(shiftPeriod('2026-08-02', 'all', 3)).toBe('2026-08-02')
  })
})

describe('periodLabel', () => {
  it('names each granularity', () => {
    expect(periodLabel('2026-08-02', 'day')).toBe('8월 2일 (일)')
    expect(periodLabel('2026-08-02', 'week')).toBe('8월 2일 – 8월 8일')
    expect(periodLabel('2026-08-02', 'month')).toBe('2026년 8월')
    expect(periodLabel('2026-08-02', 'all')).toBe('전체 기간')
  })

  it('shows both months when a week straddles them', () => {
    expect(periodLabel('2026-09-01', 'week')).toBe('8월 30일 – 9월 5일')
  })
})

describe('isWithin', () => {
  const week = periodRange('2026-08-02', 'week')

  it('includes both endpoints', () => {
    expect(isWithin('2026-08-02', week)).toBe(true)
    expect(isWithin('2026-08-08', week)).toBe(true)
  })

  it('excludes either side', () => {
    expect(isWithin('2026-08-01', week)).toBe(false)
    expect(isWithin('2026-08-09', week)).toBe(false)
  })

  it('matches everything when unbounded', () => {
    expect(isWithin('1999-01-01', { start: null, end: null })).toBe(true)
  })
})
