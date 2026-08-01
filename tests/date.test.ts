import { describe, it, expect, vi, afterEach } from 'vitest'
import { kstToday } from '@/lib/date'

describe('kstToday', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the KST calendar date, not the UTC one, during the KST 00:00-09:00 window', () => {
    // 2026-08-01 15:30 UTC = 2026-08-02 00:30 KST (KST is UTC+9) -- squarely
    // inside the 9-hour window where UTC is still "yesterday" relative to
    // Seoul's wall clock.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T15:30:00.000Z'))

    expect(kstToday()).toBe('2026-08-02')
  })

  it('agrees with the UTC date outside the boundary window (sanity check)', () => {
    // 2026-08-01 04:00 UTC = 2026-08-01 13:00 KST -- both calendars agree here.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T04:00:00.000Z'))

    expect(kstToday()).toBe('2026-08-01')
  })

  it('handles the exact midnight KST boundary correctly', () => {
    // 2026-08-01 15:00:00.000 UTC = 2026-08-02 00:00:00.000 KST exactly.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T15:00:00.000Z'))

    expect(kstToday()).toBe('2026-08-02')
  })
})
