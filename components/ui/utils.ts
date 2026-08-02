// Minimal className joiner -- no clsx/tailwind-merge dependency added for
// this. This system's variant maps never produce genuinely conflicting
// utilities for the same CSS property within one element (each component
// below picks exactly one entry per variant map), so tailwind-merge's
// conflict-resolution behavior isn't needed, just concatenation-with-
// filtering. Kept dependency-free to keep this pass's footprint small.
export type ClassValue = string | false | null | undefined

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
