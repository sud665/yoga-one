import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12 text-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-3xl font-medium text-black">접근할 수 없습니다</h1>
        <p className="mb-8 text-base text-zinc-600">
          이 화면에 접근할 권한이 없습니다. 소속된 요가원의 데이터만 볼 수 있습니다.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-black px-8 py-3 text-base font-medium text-white transition hover:bg-zinc-800"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
