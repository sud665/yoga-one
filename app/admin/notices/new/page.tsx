'use client'

import { useState } from 'react'
import { Megaphone, Check } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextInput, Textarea } from '@/components/ui/TextInput'
import { createNotice } from '@/lib/actions/notices'
import type { NoticeTarget } from '@/lib/types'

const TARGETS: { value: NoticeTarget; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'member', label: '회원' },
  { value: 'instructor', label: '강사' },
]

const TARGET_SENT_LABEL: Record<NoticeTarget, string> = {
  all: '회원 · 강사 전체',
  member: '회원 전체',
  instructor: '강사 전체',
}

export default function AdminNoticeWritePage() {
  const [target, setTarget] = useState<NoticeTarget>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pin, setPin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posted, setPosted] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const formData = new FormData()
    formData.set('title', title)
    formData.set('body', body)
    formData.set('target', target)
    if (pin) formData.set('pin', 'on')
    const result = await createNotice(formData)
    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setPosted(true)
  }

  if (posted) {
    return (
      <div className="w-full px-6 py-12">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
            <Check className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
          </span>
          <h1 className="text-heading-lg text-ink">공지를 게시했습니다</h1>
        </div>
        <Card>
          <p className="text-body-md text-body">{TARGET_SENT_LABEL[target]}에게 발송되었습니다. 앱 알림과 공지 목록에 동시에 올라갑니다.</p>
        </Card>
        <Button href="/admin/notices" variant="secondary" className="mt-5 w-full">
          목록으로
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <Megaphone className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">새 공지 작성</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-caption text-muted">받는 대상</p>
          <div className="flex gap-1 rounded-input border border-hairline bg-surface-soft p-1">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTarget(t.value)}
                className={
                  'h-9 flex-1 rounded-[6px] text-label transition-colors ' +
                  (target === t.value ? 'bg-canvas text-ink' : 'text-muted')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <TextInput
          name="title"
          placeholder="제목"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          name="body"
          placeholder="내용을 입력하세요"
          rows={8}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />

        <label className="flex cursor-pointer items-center gap-3 rounded-input border border-hairline bg-canvas p-3.5">
          <input
            type="checkbox"
            checked={pin}
            onChange={(event) => setPin(event.target.checked)}
            className="h-4 w-4 accent-brand-deep"
          />
          <span>
            <span className="block text-body-strong text-ink">목록 상단에 고정</span>
            <span className="mt-0.5 block text-caption text-muted">중요한 공지는 항상 맨 위에 보입니다</span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-body-md text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? '게시하는 중...' : '게시하기'}
        </Button>
        <Button href="/admin/notices" variant="secondary" className="w-full">
          취소
        </Button>
      </form>
    </div>
  )
}
