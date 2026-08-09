'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import {
  createClassTemplate,
  updateClassTemplate,
  listInstructors,
  type InstructorOption,
  type TemplateWithLabel,
} from '@/lib/actions/schedule'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'
import { Dropdown } from '@/components/ui/Dropdown'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Plus, Check } from 'lucide-react'

const DAY_OPTIONS = [
  { value: '0', label: '일' },
  { value: '1', label: '월' },
  { value: '2', label: '화' },
  { value: '3', label: '수' },
  { value: '4', label: '목' },
  { value: '5', label: '금' },
  { value: '6', label: '토' },
]

// 마법사(members/new)의 Field와 같은 라벨-위-인풋 패턴. 이 폼은 원래
// placeholder가 라벨을 겸했는데, 값이 들어가는 순간 필드가 뭐였는지가
// 사라졌다(특히 시간/분/정원처럼 숫자만 남는 칸). 모든 인풋이 라벨을 위에
// 단다.
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

export function TemplateForm({
  onSaved,
  template,
  onCancel,
}: {
  onSaved: () => void
  /** Present -> edit this template in place. Absent -> the create form. */
  template?: TemplateWithLabel
  /** Only meaningful (and only rendered) alongside `template`. */
  onCancel?: () => void
}) {
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(template)

  // 강사는 controlled: 커스텀 Dropdown은 hidden input으로 FormData에
  // 참여하므로 선택값이 리액트 상태로 살아 있어야 한다. (기존 select 시절
  // instructorId가 controlled였던 이유 -- 목록이 비동기로 늦게 도착 --
  // 도 그대로 유효하다.)
  const [instructorId, setInstructorId] = useState(template?.instructor_id ?? '')
  // 요일은 복수 선택: "월·수·금 같은 수업" 같은 반복이 요일 수만큼 폼을
  // 다시 채우는 일이었어서, 생성 폼은 고른 요일마다 템플릿을 하나씩 일괄
  // 등록한다. DB는 템플릿 1행 = 요일 1개 구조 그대로이므로(요일별로 정원·
  // 강사가 갈라질 수 있는 구조) 수정 폼은 그 행의 요일 하나를 고르는
  // 단일 선택으로 동작한다.
  const [days, setDays] = useState<string[]>(template ? [String(template.day_of_week)] : [])

  useEffect(() => {
    listInstructors().then(setInstructors)
  }, [])

  function toggleDay(value: string) {
    if (isEditing) {
      setDays([value])
      return
    }
    setDays((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  // 검증을 통과해 확인 다이얼로그 뒤에서 대기 중인 제출(FormData 스냅샷).
  const [pendingData, setPendingData] = useState<FormData | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // onSubmit + preventDefault (WithdrawScreen과 같은 패턴), <form action>이
  // 아닌 이유: React 19의 폼 액션은 액션이 끝나는 즉시 uncontrolled 인풋을
  // 자동 리셋한다. 확인 다이얼로그가 액션 완료 뒤에 뜨는 구조에서는 취소를
  // 눌러도 방금 채운 폼이 이미 비워져 있게 된다 -- 취소가 입력을 날리면
  // 확인창의 의미가 없다. 리셋은 아래 runSave가 성공했을 때만 직접 한다.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    // hidden input/칩은 브라우저 required 검증을 타지 않으므로 여기서 막는다
    // -- 안 막으면 서버 액션이 Number('') = NaN을 DB로 흘려보낸다.
    if (!formData.get('instructorId')) {
      setError('강사를 선택해주세요.')
      return
    }
    if (days.length === 0) {
      setError('요일을 하나 이상 선택해주세요.')
      return
    }
    setError(null)
    // 시간표 등록/수정은 8주치 수업(class_sessions)을 즉시 만들어내는
    // 무거운 이벤트라, 바로 실행하지 않고 확인을 한 번 거친다.
    setPendingData(formData)
  }

  function runSave(formData: FormData) {
    startTransition(async () => {
      if (template) {
        formData.set('dayOfWeek', days[0])
        const result = await updateClassTemplate(template.id, formData)
        // `'error' in result` (not `result?.error`): result's type is a
        // genuine union of two disjoint literal shapes, so `in` is what
        // actually narrows it -- matching app/admin/invites/page.tsx.
        if ('error' in result) {
          setError(result.error)
          return
        }
        onSaved()
        return
      }

      // 고른 요일마다 한 건씩, 순차 생성. 병렬로 쏘지 않는 이유:
      // generate_sessions_for_template까지 요일당 한 번씩 도는 무거운
      // 호출이라 실패 지점을 요일 단위로 특정하고 싶고, 부분 실패 시
      // 이미 만들어진 요일은 리스트 새로고침으로 그대로 드러나야 한다.
      const failed: string[] = []
      let firstError = ''
      for (const day of days) {
        formData.set('dayOfWeek', day)
        const result = await createClassTemplate(formData)
        if ('error' in result) {
          failed.push(DAY_OPTIONS.find((d) => d.value === day)?.label ?? day)
          if (!firstError) firstError = result.error
        }
      }
      if (failed.length > 0) {
        // 입력은 그대로 둔다 -- 실패한 요일만 다시 골라 재시도할 수 있게.
        setError(`${failed.join('·')}요일 등록에 실패했습니다: ${firstError}`)
        onSaved() // 성공한 요일은 리스트에 반영
        return
      }
      formRef.current?.reset()
      setInstructorId('')
      setDays([])
      onSaved()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="클래스명" htmlFor="template-title">
        <TextInput id="template-title" name="title" placeholder="예: 하타 요가" defaultValue={template?.title} required />
      </Field>

      <Field label="강사">
        <Dropdown
          name="instructorId"
          label="강사"
          placeholder="강사 선택"
          value={instructorId}
          onChange={setInstructorId}
          options={instructors.map((i) => ({ value: i.id, label: i.full_name }))}
        />
      </Field>

      {/* 마법사의 "수강 클래스 (복수 선택)"과 같은 토글 칩 앙상블 -- 7개가
          한눈에 보여서 드롭다운을 열고 닫는 것보다 복수 선택이 빠르다. */}
      <Field label={isEditing ? '요일' : '요일 (복수 선택)'}>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => {
            const picked = days.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={picked}
                onClick={() => toggleDay(day.value)}
                className={
                  'h-10 w-10 rounded-full border text-caption transition-colors ' +
                  (picked ? 'border-brand-deep bg-brand-tint text-brand-deep' : 'border-hairline bg-surface text-body')
                }
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="시작 시간" htmlFor="template-start-time">
        <TextInput id="template-start-time" name="startTime" type="time" defaultValue={template?.start_time} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="수업 시간(분)" htmlFor="template-duration">
          <TextInput
            id="template-duration"
            name="durationMin"
            type="number"
            placeholder="60"
            defaultValue={template?.duration_min ?? 60}
            required
          />
        </Field>
        <Field label="정원(명)" htmlFor="template-capacity">
          <TextInput id="template-capacity" name="capacity" type="number" placeholder="10" defaultValue={template?.capacity} required />
        </Field>
      </div>

      {error && (
        <p role="alert" className="text-body-md text-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        {isEditing && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending} className="flex-1">
            취소
          </Button>
        )}
        <Button type="submit" icon={isEditing ? Check : Plus} disabled={isPending} className="flex-1">
          {isEditing ? '저장' : '시간표 추가'}
        </Button>
      </div>

      {/* ConfirmDialog의 버튼은 Button 기본값 type="button"이라 form 안에
          있어도 재제출을 일으키지 않는다. */}
      <ConfirmDialog
        open={pendingData !== null}
        title={isEditing ? '변경 내용을 저장할까요?' : '시간표를 등록할까요?'}
        description={
          pendingData
            ? // "8주치"가 아니라 "계속": 8주 선생성은 pg_cron이 매주 다시
              // 채우는 구현 디테일이고, 원장 입장의 사실은 "변경하지 않는 한
              // 매주 반복"이다.
              `${days
                .map((d) => DAY_OPTIONS.find((o) => o.value === d)?.label ?? d)
                .join('·')}요일 ${String(pendingData.get('startTime'))} · ${String(pendingData.get('title'))} — ${
                isEditing ? '앞으로 생성되는 수업에 바로 반영됩니다.' : '변경하지 않는 한 매주 계속 생성됩니다.'
              }`
            : undefined
        }
        confirmLabel={isEditing ? '저장' : '등록'}
        onConfirm={() => {
          if (!pendingData) return
          const formData = pendingData
          setPendingData(null)
          runSave(formData)
        }}
        onCancel={() => setPendingData(null)}
      />
    </form>
  )
}
