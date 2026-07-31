import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const PUBLIC_PREFIXES = ['/login', '/signup', '/invite', '/auth/callback', '/onboarding']

function roleHomePath(role: 'owner' | 'instructor' | 'member') {
  return role === 'owner' ? '/admin' : `/${role}`
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))

  if (!user) {
    if (isPublic) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (!profile) {
    if (path.startsWith('/onboarding')) return response
    return NextResponse.redirect(new URL('/onboarding/studio-name', request.url))
  }

  const homePath = roleHomePath(profile.role)
  if (path === '/' ) {
    return NextResponse.redirect(new URL(homePath, request.url))
  }
  if (!isPublic && !path.startsWith(homePath)) {
    return NextResponse.redirect(new URL(homePath, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
}
