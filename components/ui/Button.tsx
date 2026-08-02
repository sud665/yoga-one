'use client'

import Link from 'next/link'
import { cx } from './utils'

// DESIGN.md `button-primary`/`button-secondary`/`button-danger` +
// button-lg/md/sm typography. Every variant stays pill-shaped
// (rounded-full) per DESIGN.md's "버튼 모양을 세 번째로 늘리지 않는다 --
// 알약형 또는 원형 아이콘, 그게 전부" rule -- there is no square/sharp
// variant here by design, not by omission.
export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

type CommonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
}

// href present -> renders a Next.js <Link> styled identically to a
// <button>, for nav-shaped CTAs ("바로가기" cards, "홈으로 돌아가기"-style
// links). href absent -> renders a real <button>. One component, one visual
// vocabulary, instead of every call site hand-rolling an <a> that happens
// to look like a button.
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
  primary: 'bg-ink text-on-primary hover:bg-charcoal',
  // DESIGN.md button-danger: canvas background, full-colored text only --
  // deliberately not a filled red button, so a destructive action is never
  // one easy mis-tap away from looking like the primary CTA.
  secondary: 'bg-soft-cloud text-ink hover:bg-hairline-soft',
  danger: 'border border-hairline bg-canvas text-full hover:bg-soft-cloud',
}

// DESIGN.md only states one explicit CTA height (48px, "button-primary").
// sm/lg are inferred from the typography scale's own button-sm/button-lg
// entries and rounded to the 8px grid. sm is 44px (not the smaller ~36px
// inline actions that predate this token system, e.g. member/bookings'
// "취소" button) specifically to satisfy DESIGN.md's own WCAG AAA
// touch-target requirement (44x44) without relying on hit-area expansion
// tricks.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-11 px-6 text-button-sm',
  md: 'h-12 px-8 text-button-md',
  lg: 'h-14 px-10 text-button-lg',
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-full text-center transition-colors duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

// :focus-visible ring comes from the global base-layer rule in
// app/globals.css (Adjustment #2) -- not repeated per-component here.
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className, children, ...rest } = props
  const classes = cx(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)

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
