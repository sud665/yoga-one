// Asia/Seoul is a fixed UTC+9 offset with no daylight-saving transitions, so
// a plain millisecond shift is safe here (unlike zones with DST, where this
// trick would occasionally be wrong around the transition).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * Today's calendar date in KST (Asia/Seoul), as 'YYYY-MM-DD'.
 *
 * Mirrors `(now() at time zone 'Asia/Seoul')::date`, used at the equivalent
 * SQL call sites (list_upcoming_sessions_for_member,
 * _generate_sessions_internal -- supabase/migrations/20260724100006_final_review_fixes.sql).
 * Use this instead of `new Date().toISOString().slice(0, 10)` (or any other
 * UTC-today expression) anywhere "오늘" needs to match a Korean user's wall
 * clock -- that reads the UTC calendar date, which is wrong for the 9 hours
 * a day (KST 00:00-09:00) where UTC is still on the previous day.
 */
export function kstToday(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10)
}
