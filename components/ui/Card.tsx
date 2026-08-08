import { cx } from './utils'

// DESIGN.md `card`/`card-brand`: hairline border + rounded-card (16px) is
// still the primary structural device, but this pass ("Classical") adds a
// soft shadow on top of it -- surface (white) is now a distinct layer from
// canvas (warm greige), and a hairline alone reads flatter than the design
// source's own cards. See globals.css's Shadow comment for why the
// zero-shadow rule two prior passes kept was dropped.
export type CardVariant = 'default' | 'soft' | 'brand'
export type CardPadding = 'sm' | 'md' | 'lg'

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  children: React.ReactNode
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  // Standard panel: surface + hairline border + elev-1 shadow.
  default: 'border border-hairline bg-surface text-ink shadow-elev-1',
  // Recessed panel, no border/shadow needed -- surface-soft already reads
  // as a step back from canvas, and DESIGN.md's shadow rule only applies to
  // true white surfaces (surface-soft is deliberately flat).
  soft: 'bg-surface-soft text-ink',
  // DESIGN.md `card-brand`: the system's one "voltage" surface (DESIGN.md:
  // "화면당 최대 1-2개 -- 전압은 희소해야 신호가 된다"), used sparingly for
  // e.g. the dashboard's summary stats. The fill itself is brand-deep,
  // which this pass moves from sage to forest green -- the token value
  // changed in globals.css, nothing here needed to change.
  brand: 'bg-brand-deep text-on-brand',
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
