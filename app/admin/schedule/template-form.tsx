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
import { useToast } from '@/components/ui/Toast'
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

function dayLabel(value: string): string {
  return DAY_OPTIONS.find((d) => d.value === value)?.label ?? value
}

// 수정 폼에서 요일을 여러 개 고르면 그 행 자체가 복수 요일을 갖는 게
// 아니라(DB는 여전히 템플릿 1행 = 요일 1개), 원래 요일을 그대로 뒀는지에
// 따라 갈린다: 뒀으면 이 행은 day_of_week 불변으로 갱신되고, 뺐으면 새로
// 고른 요일 중 하나로 이 행 자체가 옮겨간다(기존 "요일 바꾸기" 동작
// 그대로). 어느 쪽이든 나머지 추가 요일들은 별도 행으로 새로 생성된다 --
// runSave와 확인 다이얼로그 문구 양쪽이 같은 분배를 봐야 해서 순수 함수로
// 뺐다.
function splitEditDays(originalDay: string, days: string[]): { updateDay: string; extraDays: string[] } {
  const keepsOriginal = days.includes(originalDay)
  return {
    updateDay: keepsOriginal ? originalDay : days[0],
    extraDays: keepsOriginal ? days.filter((d) => d !== originalDay) : days.slice(1),
  }
}

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
  const { toast } = useToast()

  // 강사는 controlled: 커스텀 Dropdown은 hidden input으로 FormData에
  // 참여하므로 선택값이 리액트 상태로 살아 있어야 한다. (기존 select 시절
  // instructorId가 controlled였던 이유 -- 목록이 비동기로 늦게 도착 --
  // 도 그대로 유효하다.)
  const [instructorId, setInstructorId] = useState(template?.instructor_id ?? '')
  // 요일은 복수 선택 -- 생성이든 수정이든 동일하게 동작한다("월·수·금 같은
  // 수업"). 수정 폼은 원래 요일 하나만 켜진 채로 열리고, 추가로 고른
  // 요일은 splitEditDays()가 runSave에서 별도 템플릿 행으로 분배한다.
  const [days, setDays] = useState<string[]>(template ? [String(template.day_of_week)] : [])

  useEffect(() => {
    listInstructors().then(setInstructors)
  }, [])

  function toggleDay(value: string) {
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
        const { updateDay, extraDays } = splitEditDays(String(template.day_of_week), days)
        formData.set('dayOfWeek', updateDay)
        const result = await updateClassTemplate(template.id, formData)
        // `'error' in result` (not `result?.error`): result's type is a
        // genuine union of two disjoint literal shapes, so `in` is what
        // actually narrows it -- matching app/admin/invites/page.tsx.
        if ('error' in result) {
          setError(result.error)
          return
        }

        if (extraDays.length > 0) {
          const failed: string[] = []
          let firstError = ''
          for (const day of extraDays) {
            formData.set('dayOfWeek', day)
            const extraResult = await createClassTemplate(formData)
            if ('error' in extraResult) {
              failed.push(dayLabel(day))
              if (!firstError) firstError = extraResult.error
            }
          }
          if (failed.length > 0) {
            // 원래 행 저장은 이미 성공했으니 폼을 그대로 닫는다(아래
            // onSaved) -- 추가 요일 실패는 토스트로만 알린다. 인라인
            // error state였다면 onSaved가 이 폼을 언마운트하는 순간 같이
            // 사라져 원장이 무엇이 실패했는지 볼 방법이 없다.
            toast({
              title: `${failed.join('·')}요일 추가에 실패했습니다`,
              description: firstError,
              tone: 'error',
            })
          }
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
          failed.push(dayLabel(day))
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

  // 확인 다이얼로그 설명. runSave와 같은 splitEditDays() 분배를 봐야
  // 하므로(수정 시 "이 행 갱신" / "새로 추가되는 행" 문구가 갈린다) 여기서
  // 도 호출한다 -- 순수 함수라 두 번 계산해도 비용이 없다.
  function confirmDescription(): string | undefined {
    if (!pendingData) return undefined
    const daysLabel = days.map(dayLabel).join('·')
    const head = `${daysLabel}요일 ${String(pendingData.get('startTime'))} · ${String(pendingData.get('title'))}`
    if (!template) {
      // "8주치"가 아니라 "계속": 8주 선생성은 pg_cron이 매주 다시 채우는
      // 구현 디테일이고, 원장 입장의 사실은 "변경하지 않는 한 매주
      // 반복"이다.
      return `${head} — 변경하지 않는 한 매주 계속 생성됩니다.`
    }
    const { extraDays } = splitEditDays(String(template.day_of_week), days)
    if (extraDays.length === 0) return `${head} — 앞으로 생성되는 수업에 바로 반영됩니다.`
    return `${head} — 기존 요일은 변경 내용이 바로 반영되고, ${extraDays.map(dayLabel).join('·')}요일은 새 시간표로 추가됩니다.`
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
          한눈에 보여서 드롭다운을 열고 닫는 것보다 복수 선택이 빠르다.
          수정 폼도 동일하게 복수 선택이다 -- splitEditDays()가 원래
          요일을 제외한 나머지를 별도 행으로 만든다. */}
      <Field label="요일 (복수 선택)">
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
        description={confirmDescription()}
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
