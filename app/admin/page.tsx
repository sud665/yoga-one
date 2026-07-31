'use client'

import { useState, useEffect } from 'react'
import { getDashboardSummary } from '@/lib/actions/dashboard'

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState({ todaySessionCount: 0, waitlistedCount: 0 })

  useEffect(() => {
    getDashboardSummary().then(setSummary)
  }, [])

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-medium text-black">원장 대시보드</h1>

      {/* DESIGN.md의 dashboard-summary-card 토큰(잉크 배경 + 반전 텍스트, heading-lg급 숫자)을
          근사한 Tailwind 카드 -- 다른 모든 admin/member/instructor 화면이 이미 그렇듯 브리핑의
          맨 <p> 텍스트를 그대로 카드 안에 담는다(문구 자체는 브리핑과 동일하게 유지). */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 rounded-none bg-black px-6 py-8 text-white">
          <p className="text-lg font-medium">오늘 수업 {summary.todaySessionCount}건</p>
        </div>
        <div className="flex-1 rounded-none bg-black px-6 py-8 text-white">
          <p className="text-lg font-medium">대기중인 예약 {summary.waitlistedCount}건</p>
        </div>
      </div>
    </div>
  )
}
