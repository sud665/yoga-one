'use client'

import { useCallback, useMemo, useState } from 'react'

import { kstToday } from './date'
import { isWithin, periodRange, type Granularity } from './period'

/**
 * State + filtering for the 일/주/월 controls, so each dated screen wires up
 * the same three lines instead of re-deriving the range.
 *
 * The anchor starts at today in KST rather than the host's today. Every date
 * these screens show comes from Postgres as a KST calendar date, so anchoring
 * on the browser's local day would put a member in, say, UTC-5 on "yesterday"
 * for the nine hours a day the two calendars disagree -- and the day filter
 * would open on the wrong day with no clue why.
 */
export function usePeriodFilter(initial: Granularity = 'all') {
  const [granularity, setGranularity] = useState<Granularity>(initial)
  const [anchor, setAnchor] = useState<string>(() => kstToday())

  const range = useMemo(() => periodRange(anchor, granularity), [anchor, granularity])

  /** Narrows a list to the current period. `getDate` returns 'YYYY-MM-DD'. */
  const filter = useCallback(
    <T,>(items: T[], getDate: (item: T) => string | null | undefined): T[] =>
      items.filter((item) => {
        const date = getDate(item)
        // Rows with no date can't be placed in a period. Keeping them would
        // make them look like they belong to whichever one is selected, so
        // they only survive the unbounded '전체'.
        if (!date) return granularity === 'all'
        return isWithin(date, range)
      }),
    [granularity, range]
  )

  return { granularity, setGranularity, anchor, setAnchor, range, filter }
}
