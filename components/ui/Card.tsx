import { cx } from './utils'

// DESIGN.md `card`/`card-ink`: hairline border + rounded-card (14px) is the
// system's primary structural device now ("헤어라인이 먼저, 그림자는 없음")
// -- there is no drop-shadow variant anywhere in this system, by design.
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
  // Recessed panel, no border needed -- surface-soft already reads as a
  // step back from canvas.
  soft: 'bg-surface-soft text-ink',
  // DESIGN.md `card-ink`: ink background, on-ink text -- the system's one
  // "voltage" surface (DESIGN.md: "화면당 최대 1-2개 -- 전압은 희소해야
  // 신호가 된다"), used sparingly for e.g. the dashboard's summary stats.
  ink: 'bg-ink text-on-ink',
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
