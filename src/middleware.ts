import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
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
      // Check user role from profiles table
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
    if (request.nextUrl.pathname.startsWith('/ruta') && role !== 'repartidor') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

    // Since delivery is at /ruta, redirect from / to /ruta
    if (request.nextUrl.pathname === '/' && role !== 'admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/ruta'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
