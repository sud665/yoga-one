import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // getResponse()를 함수로 반환한다 — response를 값으로 그냥 반환하면(구조분해),
  // 토큰 리프레시로 setAll이 나중에(supabase.auth.* 호출 도중) response를 재할당해도
  // 호출자는 이미 예전 값을 구조분해해서 들고 있어 절대 그 갱신을 못 본다.
  // 그러면 미들웨어의 모든 반환 경로(특히 NextResponse.redirect로 새로 만든 응답들)가
  // 갱신된 세션 쿠키 없이 나가서, 토큰이 리프레시될 때마다 사용자가 무단 로그아웃될 수 있다.
  // 호출자는 반드시 모든 supabase 호출이 끝난 뒤 getResponse()를 호출해야 한다.
  return { supabase, getResponse: () => response }
}
