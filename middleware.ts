import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Nicht eingeloggt
  if (!user) {
    if (isLoginPage) return response

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Eingeloggt + auf Login-Seite -> erstmal NICHT sofort umleiten,
  // sondern erst Profil/Rolle sauber prüfen
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role as Role | undefined

  // Falls Profil oder Rolle fehlt -> nur Login zulassen
  if (profileError || !role) {
    if (isLoginPage) return response

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Eingeloggt + gültige Rolle + Login-Seite
  if (isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = getDefaultRouteForRole(role)
    return NextResponse.redirect(url)
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