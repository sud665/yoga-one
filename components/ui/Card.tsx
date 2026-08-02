import { cx } from './utils'

// Adjustment #1: cards read as distinct panels via rounded-card (16px) +
// a hairline border (DESIGN.md's Elevation Level 1) instead of a literal
// drop shadow, keeping the flat commerce identity intact while giving data
// containers enough definition to separate from the page background.
export type CardVariant = 'default' | 'soft' | 'ink'
export type CardPadding = 'sm' | 'md' | 'lg'

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  children: React.ReactNode
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  // Standard panel: canvas + hairline border (Elevation Level 1).
  default: 'border border-hairline bg-canvas text-ink',
  // Recessed panel, no border needed -- soft-cloud already reads as a step
  // back from canvas (DESIGN.md's most-used non-white surface).
  soft: 'bg-soft-cloud text-ink',
  // DESIGN.md `dashboard-summary-card`: ink background, on-primary text.
  // Previously hardcoded per-page as `rounded-none bg-black` -- now a Card
  // variant so any screen can reach for the same summary-stat treatment.
  ink: 'bg-ink text-on-primary',
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ variant = 'default', padding = 'md', className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx('rounded-card', VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className)}
      {...rest}
    >
      {children}
    </div>
  )
}
