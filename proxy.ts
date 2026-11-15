import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Cookie que identifica esta sesión (la escribe app/api/auth/ip-sesion).
const COOKIE_SESION = 'exacta_sesion'

// Rutas donde NO se aplica "una sola sesión por cuenta": son las que crean o
// recuperan una sesión sin pasar por /login (confirmar correo, restablecer
// contraseña) y el propio registro del identificador.
const RUTAS_SIN_CONTROL_DE_SESION = [
  '/login',
  '/registro',
  '/recuperar-password',
  '/actualizar-password',
  '/auth/',
  '/api/auth/',
]

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
    // Al iniciar sesión en /login (ver app/(auth)/login/page.tsx) se genera
    // un identificador al azar que queda en perfiles.sesion_id y en la cookie
    // exacta_sesion de ese navegador. Si esta petición llega con sesión
    // válida pero con otro identificador (o sin cookie), esa sesión ya no es
    // la más reciente: se cierra. Así, compartir usuario y contraseña obliga
    // a los dos a estar reiniciando sesión todo el tiempo (quien entra de
    // último "gana"). A diferencia de la IP, el identificador no cambia
    // cuando el alumno pasa de wifi a datos, y sí distingue a dos personas
    // conectadas desde la misma red.
    // Columna nueva: supabase/migraciones/2026-11-15_sesion_id.sql. Si esa
    // migración todavía no corrió en la base, la consulta de abajo falla y
    // el bloque se salta solo — nunca debe tocar el cálculo de "rol" de
    // arriba ni romper el enrutamiento por rol para nadie.
    const ruta = request.nextUrl.pathname
    const sinControl = RUTAS_SIN_CONTROL_DE_SESION.some((r) => ruta.startsWith(r))

    if (!sinControl) {
      try {
        const { data: sesion, error: sesionError } = await supabase
          .from('perfiles')
          .select('sesion_id')
          .eq('id', user.id)
          .single()

        const cookieSesion = request.cookies.get(COOKIE_SESION)?.value

        if (!sesionError && sesion?.sesion_id && sesion.sesion_id !== cookieSesion) {
          await supabase.auth.signOut()
          const url = new URL('/login', request.url)
          url.searchParams.set('motivo', 'otra-conexion')
          const response = NextResponse.redirect(url)
          // Las cookies de sesión ya se limpiaron (signOut) en supabaseResponse;
          // hay que copiarlas a la respuesta de redirect o el navegador no se entera.
          supabaseResponse.cookies.getAll().forEach((c) => {
            response.cookies.set(c.name, c.value, c)
          })
          response.cookies.delete(COOKIE_SESION)
          return response
        }
      } catch (err) {
        console.error('Verificación de sesión única falló (se omite):', err)
      }
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