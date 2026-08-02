'use client'

import { useState, useEffect, useCallback } from 'react'
import { listTemplatesWithUpcomingSessions, type TemplateWithLabel } from '@/lib/actions/schedule'
import { TemplateForm } from './template-form'
import type { ClassSession } from '@/lib/types'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

type ScheduleData = { templates: TemplateWithLabel[]; sessions: ClassSession[] }

export default function SchedulePage() {
  // null (not {templates: [], sessions: []}) while loading -- matches
  // app/admin/page.tsx's Skeleton pattern, avoiding a flash of "등록된
  //시간표가 없습니다" before the real (possibly non-empty) list arrives.
  const [data, setData] = useState<ScheduleData | null>(null)

  const refresh = useCallback(() => {
    listTemplatesWithUpcomingSessions().then(setData)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-heading-lg text-ink">시간표 관리</h1>

      <TemplateForm onCreated={refresh} />

      <h2 className="mt-12 mb-4 text-heading-md text-ink">등록된 반복 시간표</h2>
      {data === null ? (
        <Skeleton variant="block" className="h-24" />
      ) : data.templates.length === 0 ? (
        <EmptyState title="등록된 시간표가 없습니다" description="위 양식으로 반복 시간표를 추가해보세요." />
      ) : (
        // Row anatomy: the class name leads (it is what an owner recognizes),
        // the recurrence rule sits under it as metadata, capacity keeps the
        // right edge. The dot-separated sentence this replaces made the six
        // e2e specs read it verbatim; they now assert the name and the rule
        // separately, which is also closer to what they actually verify.
        <ul className="flex flex-col">
          {data.templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline py-4 first:border-t-0"
            >
              <div>
                <p className="text-body-strong text-ink">{t.title}</p>
                <p className="mt-0.5 text-caption text-muted">
                  매주 {t.dayLabel}요일 {t.start_time} · {t.instructor?.full_name}
                </p>
              </div>
              <span className="text-caption text-muted">정원 {t.capacity}명</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 mb-4 text-heading-md text-ink">다가오는 세션</h2>
      {data === null ? (
        <Skeleton variant="block" className="h-24" />
      ) : data.sessions.length === 0 ? (
        <EmptyState title="다가오는 세션이 없습니다" description="반복 시간표를 등록하면 세션이 자동으로 생성됩니다." />
      ) : (
        <ul className="flex flex-col">
          {data.sessions.map((s) => (
            <li key={s.id} className="border-t border-hairline py-4 text-body-md text-ink first:border-t-0">
              {s.date} · 정원 {s.capacity}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
