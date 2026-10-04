import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

// IP real del cliente (ver proxy.ts: misma lógica, duplicada a propósito
// porque este route handler no comparte el request de proxy.ts).
function obtenerIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const primera = xff.split(',')[0]?.trim()
    if (primera) return primera
  }
  const real = request.headers.get('x-real-ip')
  return real?.trim() || null
}

// Se llama justo después de iniciar sesión (ver app/(auth)/login/page.tsx),
// antes de entrar al panel. Deja esta IP como la "dueña" de la sesión: si
// la cuenta se usa al mismo tiempo desde otra IP, proxy.ts cierra esa otra
// sesión en su siguiente petición. Usa el cliente admin (service role) para
// que la escritura no dependa de las políticas RLS de "perfiles".
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const ip = obtenerIp(request)

  // Sin IP detectable (por ejemplo en desarrollo local, sin proxy delante)
  // no hay nada que registrar; no es un error.
  if (!ip) {
    return NextResponse.json({ ok: true, registrada: false })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('perfiles')
    .update({ ip_sesion: ip, ip_sesion_en: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    // No bloquea el login: si la migración de la columna ip_sesion todavía
    // no corrió, esto va a fallar siempre y el inicio de sesión debe seguir
    // funcionando igual (ver supabase/migraciones/2026-10-04_ip_sesion.sql).
    console.error('Error al registrar IP de sesión:', error)
    return NextResponse.json({ ok: true, registrada: false })
  }

  return NextResponse.json({ ok: true, registrada: true })
}
