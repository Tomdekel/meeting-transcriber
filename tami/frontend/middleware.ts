import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // List of routes that require authentication
  const protectedPaths = ['/transcribe', '/sessions', '/session', '/record', '/settings']
  const isProtectedRoute = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // Redirect to login if accessing protected route without session
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to transcribe if accessing login while already authenticated
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/transcribe', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
