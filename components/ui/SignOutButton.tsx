'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'

import { signOut } from '@/lib/actions/auth'

import { ConfirmDialog } from './ConfirmDialog'

// 원래는 서버 컴포넌트 <form action={signOut}>이었지만(no-JS에서도 동작),
// 로그아웃이 원탭 즉시 실행이라 오탭이 곧 세션 종료였다. 확인 다이얼로그를
// 세우려면 클라이언트 상태가 필요해서 'use client'로 넘어왔다 -- 이 앱의
// 다른 모든 인터랙션(예약·등록·시트)이 이미 JS 필수라 no-JS 동작을 잃는
// 실손해는 없다.
//
// Sign-out is an exit, not a page action, so it deliberately does not use
// Button: every variant reads louder than this deserves, and each screen's
// one primary is already spent on its real action.
export function SignOutButton({ className = '' }: { className?: string }) {
  const [confirming, setConfirming] = useState(false)
  // signOut은 성공 시 redirect('/login')로 끝나 돌아오지 않는다 --
  // isPending이 다이얼로그를 busy로 잠가 이동 완료까지 연타/이탈을 막는다.
  const [isPending, startTransition] = useTransition()

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-body-strong text-muted transition-colors hover:text-ink"
      >
        {/* aria-hidden: "로그아웃" beside it is already the accessible name. */}
        <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        로그아웃
      </button>
      <ConfirmDialog
        open={confirming}
        title="로그아웃할까요?"
        description="다시 이용하려면 로그인이 필요합니다."
        confirmLabel="로그아웃"
        busy={isPending}
        onConfirm={() => startTransition(() => signOut())}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

// There is no SignOutFooter any more. Sign-out rode in the top bar of every
// screen first, then at the bottom of every page as a SignOutFooter; both
// spent recurring space on a control used once in a blue moon. Now that every
// role has a 프로필 screen, it lives there and only there
// (components/profile/ProfileScreen.tsx).
