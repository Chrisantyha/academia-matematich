import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas protegidas
  if (!user && (
    request.nextUrl.pathname.startsWith('/alumno') ||
    request.nextUrl.pathname.startsWith('/docente') ||
    request.nextUrl.pathname.startsWith('/admin')
  )) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si está logueado y va a login/registro → redirigir según rol
  if (user && (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/registro')
  )) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = perfil?.rol || 'alumno'

    if (rol === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (rol === 'docente') {
      return NextResponse.redirect(new URL('/docente', request.url))
    } else {
      return NextResponse.redirect(new URL('/alumno', request.url))
    }
  }

  // Proteger rutas por rol
  if (user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = perfil?.rol || 'alumno'

    // Solo admin puede entrar a /admin
    if (request.nextUrl.pathname.startsWith('/admin') && rol !== 'admin') {
      return NextResponse.redirect(new URL('/alumno', request.url))
    }

    // Solo docente o admin puede entrar a /docente
    if (request.nextUrl.pathname.startsWith('/docente') && rol !== 'docente' && rol !== 'admin') {
      return NextResponse.redirect(new URL('/alumno', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}