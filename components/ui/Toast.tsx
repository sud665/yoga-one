'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react'

import { cx } from './utils'

// Adjustment #3: the toast/inline-feedback pattern DESIGN.md never
// specified. Today, action results render as bare text baked into each
// page (e.g. app/member/bookings/page.tsx's `role="status"`/`role="alert"`
// <p>, app/(auth)/signup/page.tsx's own copy of the same idiom) -- correct
// but re-implemented per page with no shared component. This is that
// shared component: a ToastProvider mounted once in app/layout.tsx and a
// useToast() hook any page can call for a transient result banner, without
// replacing the existing inline role="status"/role="alert" pattern on
// pages this phase doesn't touch.
export type ToastTone = 'success' | 'error' | 'info' | 'neutral'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  /** ms before auto-dismiss. Defaults to 5000. */
  duration?: number
}

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 5000

const TONE_ICON_CLASSES: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-info',
  neutral: 'text-muted',
}

const TONE_ICONS: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  neutral: Info,
}

// error -> role="alert" (assertive), everything else -> role="status"
// (polite) -- matches this codebase's existing convention for error vs.
// non-error inline feedback (see app/(auth)/signup/page.tsx and
// app/member/bookings/page.tsx, both already split success/error this way).
const TONE_ROLE: Record<ToastTone, 'alert' | 'status'> = {
  success: 'status',
  error: 'alert',
  info: 'status',
  neutral: 'status',
}

function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  // Two-phase mount so the entrance transition has a "from" state: an
  // element that's already opaque on first paint has nothing to animate
  // from. Every motion-related class here is motion-safe:-gated, so a
  // prefers-reduced-motion visitor gets the toast at full opacity on the
  // very first paint, no transition, no flash (on top of the blanket
  // kill-switch in app/globals.css).
  const [visible, setVisible] = useState(false)
  const ToneIcon = TONE_ICONS[item.tone]

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      role={TONE_ROLE[item.tone]}
      className={cx(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-hairline bg-surface shadow-elev-2 p-4',
        'motion-safe:transition motion-safe:duration-200 motion-safe:ease-out',
        visible
          ? 'motion-safe:translate-y-0 motion-safe:opacity-100'
          : 'motion-safe:-translate-y-2 motion-safe:opacity-0'
      )}
    >
      {/* Same reasoning as StatusBadge: an icon survives greyscale and
          colorblindness where a colored dot only repeats the color. */}
      <ToneIcon aria-hidden="true" className={cx('mt-0.5 h-4 w-4 shrink-0', TONE_ICON_CLASSES[item.tone])} strokeWidth={2.25} />
      <div className="min-w-0 flex-1">
        <p className="text-body-strong text-ink">{item.title}</p>
        {item.description && <p className="mt-0.5 text-caption text-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="알림 닫기"
        className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-surface-soft hover:text-ink"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      setItems((current) => [
        ...current,
        { id, title: options.title, description: options.description, tone: options.tone ?? 'neutral' },
      ])
      const timer = setTimeout(() => dismiss(id), options.duration ?? DEFAULT_DURATION)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  // Clear any outstanding auto-dismiss timers on unmount (provider lives
  // at the root for this app's lifetime, but this keeps the component
  // correct in isolation, e.g. under test).
  useEffect(() => {
    const timersMap = timers.current
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer))
      timersMap.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* No aria-live on this wrapper: each item's own role="alert"/
          role="status" already establishes its live region individually.
          Adding a second aria-live here would risk double-announcing the
          same text in some screen readers. */}
      {/* absolute, not fixed: pinned to the app-shell frame in
          app/layout.tsx (position: relative), not the true browser
          viewport -- fixed would escape the frame and center itself across
          a whole wide desktop window instead of staying within it. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((item) => (
          <ToastItemView key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
