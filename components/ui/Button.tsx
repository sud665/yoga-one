'use client'

import Link from 'next/link'
import { cx } from './utils'

// DESIGN.md `button-primary`/`button-secondary`/`button-danger`. Retoken
// pass: buttons are no longer pill-shaped. DESIGN.md's most visible change
// from the previous system ("이전 버전과 가장 눈에 띄게 달라지는 지점") is
// exactly this -- rounded-full is now reserved for small circular/badge/tag
// elements only, and every CTA uses rounded-button (12px, a squared-rounded
// rectangle) instead.
export type ButtonVariant = 'primary' | 'secondary' | 'danger'

type CommonProps = {
  variant?: ButtonVariant
  className?: string
  children: React.ReactNode
}

// href present -> renders a Next.js <Link> styled identically to a
// <button>, for nav-shaped CTAs. href absent -> renders a real <button>.
type ButtonAsButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined
  }

type ButtonAsLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, 'className' | 'children'> & {
    href: string
  }

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-on-ink hover:bg-ink-active',
  // DESIGN.md button-secondary: canvas background + hairline border, ink
  // text -- Airtable's signature near-black-primary/white-outline-secondary
  // pair, carried over verbatim.
  secondary: 'border border-hairline bg-canvas text-ink hover:bg-surface-soft',
  // DESIGN.md button-danger: canvas background, danger-colored text AND
  // border (not a filled red button) -- a destructive action is never one
  // easy mis-tap away from looking like the primary CTA. Hover uses
  // danger-tint (the same pale wash status-badges use) rather than a darker
  // fill, keeping the restrained "never filled" rule intact even on hover.
  danger: 'border border-danger bg-canvas text-danger hover:bg-danger-tint',
}

// DESIGN.md documents exactly one height per button variant (44px,
// matching text-input's own 44px so buttons and fields share a baseline)
// and exactly one button typography token -- no lg/md/sm table this time
// (the previous DESIGN.md at least had button-lg/md/sm typography entries
// to infer a size scale from; this one doesn't). The previous Button had a
// `size` prop inferring sm/md/lg heights from that old table, but nothing
// in this codebase actually calls Button yet (grepped `<Button` across
// app/ -- zero matches), so there's no real API to preserve here, and
// DESIGN.md's own WCAG AAA touch-target floor (44px, kept from the
// previous version's Responsive Behavior rules) argues against ever going
// smaller. One size, always compliant, always matches spec exactly.
const BASE_CLASSES =
  'inline-flex h-11 items-center justify-center gap-2 rounded-button px-5 text-button text-center transition-colors duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

// :focus-visible ring comes from the global base-layer rule in
// app/globals.css -- not repeated per-component here.
export function Button(props: ButtonProps) {
  const { variant = 'primary', className, children, ...rest } = props
  const classes = cx(BASE_CLASSES, VARIANT_CLASSES[variant], className)

  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest as Omit<ButtonAsLinkProps, keyof CommonProps>
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    )
  }

  const buttonProps = rest as Omit<ButtonAsButtonProps, keyof CommonProps>
  return (
    <button type="button" className={classes} {...buttonProps}>
      {children}
    </button>
  )
}
