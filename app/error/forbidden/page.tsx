import { Button } from '@/components/ui/Button'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-canvas px-6 py-12 text-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-heading-lg text-ink">접근할 수 없습니다</h1>
        <p className="mb-8 text-body-md text-body">
          이 화면에 접근할 권한이 없습니다. 소속된 요가원의 데이터만 볼 수 있습니다.
        </p>
        <Button href="/">홈으로 돌아가기</Button>
      </div>
    </div>
  )
}
