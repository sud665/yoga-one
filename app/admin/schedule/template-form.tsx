'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  createClassTemplate,
  updateClassTemplate,
  listInstructors,
  type InstructorOption,
  type TemplateWithLabel,
} from '@/lib/actions/schedule'
import { Button } from '@/components/ui/Button'
import { TextInput, Select } from '@/components/ui/TextInput'
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

  // instructorId is the one field whose correct option arrives after first
  // paint (listInstructors() below resolves async). A plain defaultValue
  // only ever applies at mount, before that option exists, and never
  // reapplies once it does -- the edit form would stay stuck on the "강사
  // 선택" placeholder forever. Controlled state re-renders once the matching
  // <option> is in the DOM, so it self-corrects the moment the list loads.
  const [instructorId, setInstructorId] = useState(template?.instructor_id ?? '')

  useEffect(() => {
    listInstructors().then(setInstructors)
  }, [])

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = template
        ? await updateClassTemplate(template.id, formData)
        : await createClassTemplate(formData)
      // `'error' in result` (not `result?.error`, which the initial brief
      // used): result's type is a genuine union of two disjoint literal
      // shapes, `{ error: string } | { success: true }`, neither of which is
      // optional/nullable, so `in` is what actually narrows it -- matching
      // the pattern already established in app/admin/invites/page.tsx.
      if ('error' in result) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <TextInput name="title" placeholder="클래스명" defaultValue={template?.title} required />
      <Select name="instructorId" value={instructorId} onChange={(e) => setInstructorId(e.target.value)} required>
        <option value="">강사 선택</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>
            {i.full_name}
          </option>
        ))}
      </Select>
      <Select name="dayOfWeek" defaultValue={template ? String(template.day_of_week) : undefined} required>
        {DAY_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </Select>
      <TextInput name="startTime" type="time" defaultValue={template?.start_time} required />
      <TextInput
        name="durationMin"
        type="number"
        placeholder="시간(분)"
        defaultValue={template?.duration_min ?? 60}
        required
      />
      <TextInput name="capacity" type="number" placeholder="정원" defaultValue={template?.capacity} required />
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
    </form>
  )
}
