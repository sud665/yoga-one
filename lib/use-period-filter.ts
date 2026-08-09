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
export type PeriodView = 'list' | 'calendar'

export function usePeriodFilter(initial: Granularity = 'all', initialView: PeriodView = 'list') {
  const [view, setViewState] = useState<PeriodView>(initialView)
  const [granularity, setGranularity] = useState<Granularity>(initial)
  const [anchor, setAnchor] = useState<string>(() => kstToday())

  // Entering calendar view is not itself a filter -- it only shows the grid.
  // Narrowing to a single day happens when a date is actually picked
  // (PeriodFilter wires SessionCalendar's onSelect to call both setAnchor
  // and setGranularity('day') together), not just from switching views.
  // This used to force 'day' the moment the view changed, which meant a
  // screen defaulting to calendar view opened already narrowed to today --
  // silently hiding every row that wasn't today's, the exact "where did my
  // bookings go" regression the '전체'-is-default rule above exists to
  // prevent. Switching back to list still restores whatever granularity was
  // active before the calendar detour, same as before.
  const [listGranularity, setListGranularity] = useState<Granularity>(initial)
  const setView = useCallback(
    (next: PeriodView) => {
      setViewState(next)
      if (next === 'calendar') {
        setListGranularity(granularity)
      } else {
        setGranularity(listGranularity)
      }
    },
    [granularity, listGranularity]
  )

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

  return { view, setView, granularity, setGranularity, anchor, setAnchor, range, filter }
}
