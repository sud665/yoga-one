'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cx } from './utils'

export interface DropdownOption {
  value: string
  label: string
}

export interface DropdownProps {
  /** FormData key -- mirrored into a hidden input so <form action={...}> reads it like a native select. */
  name: string
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  /** Shown on the trigger while nothing is selected. */
  placeholder?: string
  /** Accessible name for the trigger; falls back to placeholder. */
  label?: string
  className?: string
}

// 네이티브 <select>를 대체하는 앱 디자인 언어의 드롭다운. TextInput과 같은
// 흰 표면/헤어라인 트리거에, 옵션은 elev-2 팝오버 카드로 띄운다 -- OS
// 기본 셀렉트 팝업이 sage 셸 안에서 혼자 이질적으로 보이던 것을 정리.
// FormData 호환은 hidden input이 담당하므로 호출부 서버 액션은 그대로다.
export function Dropdown({ name, value, onChange, options, placeholder = '선택', label, className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value)

  // 외부 클릭/Escape로 닫기 -- 열려 있는 동안만 리스너를 단다.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label ?? placeholder}
        onClick={() => setOpen((prev) => !prev)}
        className={cx(
          'flex h-11 w-full items-center justify-between gap-2 rounded-input border bg-surface px-3.5 text-body-md transition-colors',
          open ? 'border-brand-deep' : 'border-hairline',
          selected ? 'text-ink' : 'text-muted'
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.75}
          className={cx('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label ?? placeholder}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-input border border-hairline bg-surface py-1 shadow-elev-2"
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cx(
                    'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-body-md transition-colors',
                    isSelected ? 'bg-brand-tint text-brand-deep' : 'text-ink hover:bg-surface-soft'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
