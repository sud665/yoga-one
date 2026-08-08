'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Megaphone } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { TextInput, Textarea } from '@/components/ui/TextInput'
import { useToast } from '@/components/ui/Toast'
import { getNoticeForEdit, updateNotice } from '@/lib/actions/notices'
import type { NoticeTarget } from '@/lib/types'

const TARGETS: { value: NoticeTarget; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'member', label: '회원' },
  { value: 'instructor', label: '강사' },
]

// new/page.tsx의 작성 폼과 같은 필드 구성이지만 별도 컴포넌트로 뽑지 않는다 --
// 작성 폼은 성공 시 "게시했습니다" 완료 화면으로 바뀌고 수정 폼은 목록으로
//돌아가는 등 흐름이 갈라져서, 공유하면 그 갈림길만 prop으로 다시 드러내야
// 했다. 두 폼 다 필드 다섯 개짜리라 중복이 그 정도 추상화를 정당화할 만큼
// 크지 않다.
export default function AdminNoticeEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [target, setTarget] = useState<NoticeTarget>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pin, setPin] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getNoticeForEdit(params.id).then((result) => {
      if ('error' in result) {
        setNotFound(true)
        return
      }
      setTarget(result.notice.target)
      setTitle(result.notice.title)
      setBody(result.notice.body)
      setPin(result.notice.pin)
      setLoaded(true)
    })
  }, [params.id])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const formData = new FormData()
    formData.set('title', title)
    formData.set('body', body)
    formData.set('target', target)
    if (pin) formData.set('pin', 'on')
    const result = await updateNotice(params.id, formData)
    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    toast({ title: '공지를 수정했습니다', tone: 'success' })
    router.push('/admin/notices')
  }

  if (notFound) {
    return (
      <div className="w-full px-6 py-12">
        <p className="text-body-md text-danger">존재하지 않는 공지입니다.</p>
        <Button href="/admin/notices" variant="secondary" className="mt-5 w-full">
          목록으로
        </Button>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="w-full px-6 py-12">
        <Skeleton variant="block" className="h-64" />
      </div>
    )
  }

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <Megaphone className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">공지 수정</h1>
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
                  'h-9 flex-1 rounded-lg text-label transition-colors ' +
                  (target === t.value ? 'bg-surface text-ink' : 'text-muted')
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

        <label className="flex cursor-pointer items-center gap-3 rounded-input border border-hairline bg-surface p-3.5">
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
          {submitting ? '저장하는 중...' : '저장'}
        </Button>
        <Button href="/admin/notices" variant="secondary" className="w-full">
          취소
        </Button>
      </form>
    </div>
  )
}
