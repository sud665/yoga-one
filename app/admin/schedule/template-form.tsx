'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClassTemplate, listInstructors, type InstructorOption } from '@/lib/actions/schedule'

const DAY_OPTIONS = [
  { value: '0', label: '일' },
  { value: '1', label: '월' },
  { value: '2', label: '화' },
  { value: '3', label: '수' },
  { value: '4', label: '목' },
  { value: '5', label: '금' },
  { value: '6', label: '토' },
]

const inputClassName =
  'w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black'

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
      <input name="title" placeholder="클래스명" required className={inputClassName} />
      <select name="instructorId" required className={inputClassName}>
        <option value="">강사 선택</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>
            {i.full_name}
          </option>
        ))}
      </select>
      <select name="dayOfWeek" required className={inputClassName}>
        {DAY_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <input name="startTime" type="time" required className={inputClassName} />
      <input
        name="durationMin"
        type="number"
        placeholder="시간(분)"
        defaultValue={60}
        required
        className={inputClassName}
      />
      <input name="capacity" type="number" placeholder="정원" required className={inputClassName} />
      {error && (
        <p role="alert" className="text-sm text-[#d30005]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-full bg-black px-8 py-3 text-base font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        시간표 추가
      </button>
    </form>
  )
}
