'use client'

import { useState, useEffect, useCallback } from 'react'
import { listTemplatesWithUpcomingSessions, type TemplateWithLabel } from '@/lib/actions/schedule'
import { TemplateForm } from './template-form'
import type { ClassSession } from '@/lib/types'

type ScheduleData = { templates: TemplateWithLabel[]; sessions: ClassSession[] }

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData>({ templates: [], sessions: [] })

  const refresh = useCallback(() => {
    listTemplatesWithUpcomingSessions().then(setData)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-medium text-black">시간표 관리</h1>

      <TemplateForm onCreated={refresh} />

      <h2 className="mt-12 mb-4 text-xl font-medium text-black">등록된 반복 시간표</h2>
      <ul className="flex flex-col">
        {data.templates.map((t) => (
          <li key={t.id} className="border-t border-zinc-200 py-4 text-sm text-black first:border-t-0">
            {t.dayLabel}요일 {t.start_time} · {t.title} · {t.instructor?.full_name} · 정원 {t.capacity}
          </li>
        ))}
      </ul>

      <h2 className="mt-12 mb-4 text-xl font-medium text-black">다가오는 세션</h2>
      <ul className="flex flex-col">
        {data.sessions.map((s) => (
          <li key={s.id} className="border-t border-zinc-200 py-4 text-sm text-black first:border-t-0">
            {s.date} · 정원 {s.capacity}
          </li>
        ))}
      </ul>
    </div>
  )
}
