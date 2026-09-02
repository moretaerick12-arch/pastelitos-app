import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignore static assets, PWA manifest, and service worker
  if (
    pathname.startsWith('/_next') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.js')
  ) {
    return NextResponse.next()
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/reset-password')
  const demoRole = request.cookies.get('demo_role')?.value

  // If not logged in and no demo role, redirect to login
  if (!user && !demoRole && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (user || demoRole) {
    let role = demoRole || 'repartidor'

    if (user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role) {
          role = profile.role
        }
      } catch {
        // keep fallback
      }
    }

    // Redirect authenticated users away from login
    if (isAuthRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = role === 'admin' ? '/' : '/ruta'
      return NextResponse.redirect(redirectUrl)
    }

    // Since admin is at /, redirect admin from /ruta to /
    if (pathname.startsWith('/ruta') && role !== 'repartidor') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

    // Since delivery is at /ruta, redirect from / to /ruta
    if (pathname === '/' && role !== 'admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/ruta'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js)$).*)',
  ],
}
