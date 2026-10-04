import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// IP real del cliente. Next quitó request.ip (v15+); Vercel manda la IP en
// x-forwarded-for (primer valor de la lista = cliente). En local (next dev)
// no hay ningún proxy delante, no llega este header, y la función devuelve
// null: el bloque de "una sola sesión por cuenta" se salta solo.
function obtenerIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const primera = xff.split(',')[0]?.trim()
    if (primera) return primera
  }
  const real = request.headers.get('x-real-ip')
  return real?.trim() || null
}

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

    // --- Una sola sesión activa por cuenta ---
    // Al iniciar sesión en /login (ver app/(auth)/login/page.tsx) se guarda
    // la IP en perfiles.ip_sesion. Si esta petición llega con sesión válida
    // pero desde otra IP, esa sesión ya no es la más reciente: se cierra.
    // Así, compartir usuario y contraseña obliga a los dos a estar
    // reiniciando sesión todo el tiempo (quien entra de último "gana").
    // Columna nueva: supabase/migraciones/2026-10-04_ip_sesion.sql. Si esa
    // migración todavía no corrió en la base, la consulta de abajo falla y
    // el bloque se salta solo — nunca debe tocar el cálculo de "rol" de
    // arriba ni romper el enrutamiento por rol para nadie.
    try {
      const ipActual = obtenerIp(request)
      if (ipActual) {
        const { data: sesion, error: sesionError } = await supabase
          .from('perfiles')
          .select('ip_sesion')
          .eq('id', user.id)
          .single()

        if (!sesionError && sesion?.ip_sesion && sesion.ip_sesion !== ipActual) {
          await supabase.auth.signOut()
          const url = new URL('/login', request.url)
          url.searchParams.set('motivo', 'otra-conexion')
          const response = NextResponse.redirect(url)
          // Las cookies de sesión ya se limpiaron (signOut) en supabaseResponse;
          // hay que copiarlas a la respuesta de redirect o el navegador no se entera.
          supabaseResponse.cookies.getAll().forEach((c) => {
            response.cookies.set(c.name, c.value, c)
          })
          return response
        }
      }
    } catch (err) {
      console.error('Verificación de IP de sesión falló (se omite):', err)
    }

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