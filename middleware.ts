import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const PUBLIC_PREFIXES = ['/login', '/signup', '/invite', '/auth/callback', '/onboarding', '/error']

function roleHomePath(role: 'owner' | 'instructor' | 'member') {
  return role === 'owner' ? '/admin' : `/${role}`
}

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))

  function redirect(url: string) {
    const redirectResponse = NextResponse.redirect(new URL(url, request.url))
    getResponse().cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  if (!user) {
    if (isPublic) return getResponse()
    return redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (!profile) {
    if (isPublic) return getResponse()
    return redirect('/onboarding/studio-name')
  }

  const homePath = roleHomePath(profile.role)
  if (!isPublic && !path.startsWith(homePath)) {
    return redirect(homePath)
  }

  return getResponse()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
}
