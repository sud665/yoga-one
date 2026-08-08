'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { listTemplatesWithUpcomingSessions, deleteClassTemplate, type TemplateWithLabel } from '@/lib/actions/schedule'
import { TemplateForm } from './template-form'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const ICON_BUTTON = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-50'

// Templates arrive pre-sorted by day_of_week (see listTemplatesWithUpcomingSessions),
// so same-day rows are already contiguous -- one linear pass is enough.
function groupByDay(templates: TemplateWithLabel[]) {
  const groups: { dayOfWeek: number; items: TemplateWithLabel[] }[] = []
  for (const t of templates) {
    const current = groups.at(-1)
    if (current && current.dayOfWeek === t.day_of_week) {
      current.items.push(t)
    } else {
      groups.push({ dayOfWeek: t.day_of_week, items: [t] })
    }
  }
  return groups
}

export default function SchedulePage() {
  // null (not []) while loading -- matches app/admin/page.tsx's Skeleton
  // pattern, avoiding a flash of "등록된 시간표가 없습니다" before the real
  // (possibly non-empty) list arrives.
  const [templates, setTemplates] = useState<TemplateWithLabel[] | null>(null)
  // Which single row is mid-edit, mid-delete, or reporting a delete error --
  // one at a time is enough (nothing lets an owner open two rows at once)
  // and keeps this to three primitives instead of a per-row state map.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listTemplatesWithUpcomingSessions().then(({ templates }) => setTemplates(templates))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleDelete(templateId: string) {
    setDeleteError(null)
    setDeletingId(templateId)
    const result = await deleteClassTemplate(templateId)
    setDeletingId(null)
    if ('error' in result) {
      setDeleteError(result.error)
      return
    }
    refresh()
  }

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <CalendarDays className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">시간표 관리</h1>
      </div>

      <TemplateForm onSaved={refresh} />

      <h2 className="mt-12 mb-4 text-heading-md text-ink">등록된 시간표</h2>
      {deleteError && (
        <p role="alert" className="mb-4 rounded-card bg-danger-tint px-4 py-3 text-body-strong text-danger">
          {deleteError}
        </p>
      )}
      {templates === null ? (
        <Skeleton variant="block" className="h-24" />
      ) : templates.length === 0 ? (
        <EmptyState title="등록된 시간표가 없습니다" description="위 양식으로 반복 시간표를 추가해보세요." />
      ) : (
        // Grouped by day (query already orders by day_of_week, so same-day
        // rows are contiguous -- a single pass is enough, no re-sort).
        // Flat, ungrouped list read as one long wall once a studio had more
        // than a handful of templates. Each day is a native <details>, open
        // by default (nothing hidden on load, matching PeriodFilter's "don't
        // hide rows by default" rule) so an owner can collapse the days they
        // don't need to scan right now.
        <div className="flex flex-col">
          {groupByDay(templates).map((group) => (
            <details key={group.dayOfWeek} open className="group border-t border-hairline first:border-t-0">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="text-body-strong text-ink">매주 {group.items[0].dayLabel}요일</span>
                <span className="flex items-center gap-1.5 text-caption text-muted">
                  {group.items.length}개
                  <ChevronDown
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="h-4 w-4 transition-transform group-open:rotate-180"
                  />
                </span>
              </summary>
              <ul className="flex flex-col gap-3 pb-4">
                {group.items.map((t) =>
                  editingId === t.id ? (
                    <li key={t.id}>
                      <Card>
                        <TemplateForm
                          template={t}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => {
                            setEditingId(null)
                            refresh()
                          }}
                        />
                      </Card>
                    </li>
                  ) : (
                    <li key={t.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-body-strong text-ink">{t.title}</p>
                          <p className="mt-0.5 text-caption text-muted">
                            {t.start_time} · {t.instructor?.full_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-caption text-muted">정원 {t.capacity}명</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label="시간표 수정"
                              onClick={() => setEditingId(t.id)}
                              className={`${ICON_BUTTON} border-hairline bg-surface text-muted hover:bg-surface-soft hover:text-ink`}
                            >
                              <Pencil aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              aria-label="시간표 삭제"
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              className={`${ICON_BUTTON} border-danger bg-surface text-danger hover:bg-danger-tint`}
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  )
                )}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
