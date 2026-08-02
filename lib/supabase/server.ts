import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'
import { supabasePublishableKey, supabaseUrl } from './env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component에서 호출된 경우 — 세션 갱신은 미들웨어가 담당
          }
        },
      },
    }
  )
}
