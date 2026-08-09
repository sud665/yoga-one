'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInviteWithPassword } from '@/lib/actions/invites'
import { signInWithKakao } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

export function InviteAcceptForm({ code, role }: { code: string; role: 'instructor' | 'member' }) {
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await acceptInviteWithPassword(code, formData)
      if ('error' in result) {
        setError(result.error)
        return
      }
      if ('pendingConfirmation' in result) {
        setPendingConfirmation(true)
        return
      }
      router.push('/')
    })
  }

  // 이메일 확인이 필요한 상태(hosted 프로젝트에서 enable_confirmations=true인 경우) --
  // signUp()이 세션 없이 반환되면 accept_invite를 익명으로 호출해 실패시키는 대신
  // 이 화면을 보여준다. 이메일의 확인 링크를 클릭하면 /auth/callback이 보류 중인 초대
  // 코드를 이어받아 accept_invite를 마저 호출한다.
  if (pendingConfirmation) {
    return (
      <p role="status" className="rounded-card border border-hairline bg-surface px-4 py-3 text-body-strong text-ink shadow-elev-1">
        이메일을 확인해주세요. 받으신 메일의 링크를 클릭하면 가입이 완료됩니다.
      </p>
    )
  }

  return (
    <div>
      <form action={handleSubmit} className="flex flex-col gap-4">
        <TextInput name="fullName" placeholder="이름" required />
        <TextInput name="email" type="email" placeholder="이메일" required />
        <TextInput name="password" type="password" placeholder="비밀번호" required minLength={8} />
        {error && (
          <p role="alert" className="text-body-md text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {role === 'instructor' ? '강사로 가입하기' : '회원으로 가입하기'}
        </Button>
      </form>
      <Button
        variant="secondary"
        onClick={() => signInWithKakao({ pendingInviteCode: code })}
        className="mt-3 w-full"
      >
        카카오로 가입
      </Button>
    </div>
  )
}
