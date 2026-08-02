'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClassTemplate, listInstructors, type InstructorOption } from '@/lib/actions/schedule'
import { Button } from '@/components/ui/Button'
import { TextInput, Select } from '@/components/ui/TextInput'
import { Plus } from 'lucide-react'

const DAY_OPTIONS = [
  { value: '0', label: '일' },
  { value: '1', label: '월' },
  { value: '2', label: '화' },
  { value: '3', label: '수' },
  { value: '4', label: '목' },
  { value: '5', label: '금' },
  { value: '6', label: '토' },
]

export function TemplateForm({ onCreated }: { onCreated: () => void }) {
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listInstructors().then(setInstructors)
  }, [])

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createClassTemplate(formData)
      // `'error' in result` (not `result?.error`, which the initial brief
      // used): result's type is a genuine union of two disjoint literal
      // shapes, `{ error: string } | { success: true }`, neither of which is
      // optional/nullable, so `in` is what actually narrows it -- matching
      // the pattern already established in app/admin/invites/page.tsx.
      if ('error' in result) {
        setError(result.error)
        return
      }
      onCreated()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <TextInput name="title" placeholder="클래스명" required />
      <Select name="instructorId" required>
        <option value="">강사 선택</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>
            {i.full_name}
          </option>
        ))}
      </Select>
      <Select name="dayOfWeek" required>
        {DAY_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </Select>
      <TextInput name="startTime" type="time" required />
      <TextInput name="durationMin" type="number" placeholder="시간(분)" defaultValue={60} required />
      <TextInput name="capacity" type="number" placeholder="정원" required />
      {error && (
        <p role="alert" className="text-body-md text-danger">
          {error}
        </p>
      )}
      <Button type="submit" icon={Plus} disabled={isPending} className="mt-2 w-full">
        시간표 추가
      </Button>
    </form>
  )
}
