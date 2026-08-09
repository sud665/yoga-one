'use client'

import { useEffect, useId } from 'react'

import { Button } from './Button'

// 로그아웃·회원 등록·시간표 등록/삭제처럼 한 번의 탭이 곧 실행인 액션 앞에
// 세우는 확인 다이얼로그. MemberDetailSheet가 "전용 컴포넌트가 없어서"
// window.confirm으로 버티던 자리(QA 전수검사 2026-08-08, 항목 3)의 정식
// 후속으로, 그 native confirm 사용처들도 이 컴포넌트로 갈아탔다.
//
// absolute, not fixed: Toast와 같은 이유로 app/layout.tsx의 앱 쉘 프레임
// (position: relative, max-w-md)에 고정한다 -- fixed는 프레임을 벗어나
// 넓은 데스크톱 창 전체를 덮는다. 시트들(z-[70]/z-[76])보다 위에 서야
// 시트 안에서 띄우는 확인(MemberDetailSheet)이 가려지지 않으므로 z-[80].
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  tone = 'brand',
  busy = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** danger -> 확인 버튼이 Button variant="danger" (삭제류). 기본은 primary. */
  tone?: 'brand' | 'danger'
  /** true인 동안 두 버튼 비활성 + 백드롭/Escape 무시 (실행 중 이탈 방지). */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** 제목·설명 아래 자유 콘텐츠 (등록 요약 행 등). */
  children?: React.ReactNode
}) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      if (!busy) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center p-6">
      {/* 백드롭 = 닫기. 시트들과 같은 bg-ink/40. aria-hidden: 바로 아래
          취소 버튼이 같은 동작의 접근 가능한 경로다. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => {
          if (!busy) onCancel()
        }}
        className="absolute inset-0 cursor-default bg-ink/40"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative w-full max-w-sm rounded-card border border-hairline bg-surface p-5 shadow-elev-2 motion-safe:animate-[confirm-dialog-in_160ms_ease-out]"
      >
        <p id={titleId} className="text-heading-md text-ink">
          {title}
        </p>
        {description && (
          <p id={descriptionId} className="mt-2 text-body-md text-body">
            {description}
          </p>
        )}
        {children}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {/* autoFocus(닫힘 = null 반환이므로 열릴 때마다 새 마운트 = 매번
              동작): 초기 포커스는 취소에 둔다. 이 다이얼로그의 존재 이유가
              "실수로 한 번 더"를 막는 데 있으므로, 연타된 Enter가 그대로
              확인을 통과하면 안 된다 -- Enter의 기본 착지점은 안전한 쪽. */}
          <Button autoFocus variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
