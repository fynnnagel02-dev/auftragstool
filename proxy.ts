import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getEnv } from '@/lib/env'

type Role = 'geschaeftsfuehrer' | 'admin' | 'vorarbeiter'

const rolePermissions: Record<Role, string[]> = {
  geschaeftsfuehrer: [
    '/',
    '/admin',
    '/foreman',
    '/geschaeftsfuehrer-dashboard',
    '/datensammlung',
    '/travel-expenses',
    '/employees',
    '/projects',
    '/travel-master',
    '/kpi-dashboard',
    '/settings',
  ],
  admin: [
    '/',
    '/admin',
    '/foreman',
    '/datensammlung',
    '/travel-expenses',
    '/employees',
    '/projects',
    '/travel-master',
    '/kpi-dashboard',
    '/settings',
  ],
  vorarbeiter: ['/', '/foreman'],
}

function getDefaultRouteForRole(role: Role) {
  if (role === 'vorarbeiter') return '/foreman'
  if (role === 'admin') return '/admin'
  return '/'
}

function isAllowedPath(pathname: string, role: Role) {
  const allowedPaths = rolePermissions[role]

  return allowedPaths.some((path) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(`${path}/`)
  })
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const env = getEnv()

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (isLoginPage) return response

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role as Role | undefined

  if (profileError || !role) {
    if (isLoginPage) return response

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = getDefaultRouteForRole(role)
    return NextResponse.redirect(url)
  }

  if (isApiRoute) {
    return response
  }

  if (!isAllowedPath(pathname, role)) {
    const url = request.nextUrl.clone()
    url.pathname = getDefaultRouteForRole(role)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
