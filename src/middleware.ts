import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    }
  )
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // Protected paths
  const isProtectedPath = [
    '/dashboard',
    '/trades',
    '/calendar',
    '/analytics',
    '/settings',
    '/profile',
    '/accounts',
    '/playbook',
    '/import',
  ].some(prefix => path.startsWith(prefix) || path === prefix)

  if (isProtectedPath && !session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if logged-in user visits auth pages
  const isAuthPath = ['/login', '/signup'].some(prefix => path.startsWith(prefix) || path === prefix)
  if (isAuthPath && session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
