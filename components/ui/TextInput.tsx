import { forwardRef } from 'react'
import { cx } from './utils'

// DESIGN.md `text-input`/`text-input-focus`: the one component this system
// documents as filling a real gap ("이전 버전은 폼 필드 스타일이 'Known Gap'
// 으로 미정의였는데... 그 갭을 채운다"). Every raw `<input className="w-full
// rounded-2xl border border-zinc-300 ...">` scattered across auth/admin
// pages before this pass was hand-rolled per call site with no shared
// component -- this is that shared component.
//
// Deliberately just a styled <input>, not a <label>+<input> composite: none
// of this codebase's existing forms use <label> today (every field is
// identified by `placeholder`, which is also what every Playwright spec
// locates fields by via `getByPlaceholder(...)`). Adding real <label>
// elements would be a genuine accessibility improvement, but it's a UX
// change beyond DESIGN.md's literal text-input spec (background/text/
// typography/rounded/padding/height/border) and out of this pass's
// pure-restyle scope -- noted in the final report as a follow-up, not
// silently done here.
export type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  className?: string
}

// Shared base: 44px height (matches button height -- forms and CTAs share
// one baseline), hairline border, rounded-input (8px), body-md typography.
// `flex items-center` rather than relying on line-height alone to vertically
// center single-line text at a fixed height -- more robust across browsers
// than tuning line-height to exactly fill the box.
const FIELD_CLASSES =
  'flex h-11 w-full items-center rounded-input border border-hairline bg-canvas px-3.5 text-body-md text-ink placeholder:text-muted transition-colors duration-150 focus:border-info focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cx(FIELD_CLASSES, className)} {...rest} />
})

// Not a DESIGN.md-named component (the spec only documents text-input), but
// template-form.tsx's instructor/day-of-week pickers need the identical
// visual treatment to read as the same form language -- sharing FIELD_CLASSES
// rather than re-deriving a second ad hoc class string keeps the two
// perfectly in sync if the token values ever move again.
export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  className?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cx(FIELD_CLASSES, className)} {...rest} />
})
