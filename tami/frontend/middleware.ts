import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Get auth token from cookies
  const token = req.cookies.get('sb-access-token')?.value

  // List of routes that require authentication
  const protectedPaths = ['/transcribe', '/sessions', '/session', '/record', '/settings']
  const isProtectedRoute = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // Redirect to login if accessing protected route without session
  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to transcribe if accessing login while already authenticated
  if (token && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/transcribe', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
