import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

// Nombre de la cookie que identifica esta sesión (ver proxy.ts).
const COOKIE_SESION = 'exacta_sesion'

// Se llama justo después de iniciar sesión (ver app/(auth)/login/page.tsx),
// antes de entrar al panel. Genera un identificador al azar, lo guarda en
// perfiles.sesion_id y lo deja en una cookie de este navegador: esta pasa a
// ser la sesión "dueña" de la cuenta. Si la cuenta inicia sesión en otro
// navegador, el identificador cambia y proxy.ts cierra esta sesión en su
// siguiente petición. (La ruta conserva el nombre "ip-sesion" de cuando se
// comparaba por IP; ver supabase/migraciones/2026-11-15_sesion_id.sql.)
// Usa el cliente admin (service role) para que la escritura no dependa de
// las políticas RLS de "perfiles".
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sesionId = randomUUID()

  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('perfiles')
    .update({ sesion_id: sesionId, sesion_en: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    // No bloquea el login: si la migración de la columna sesion_id todavía
    // no corrió, esto va a fallar siempre y el inicio de sesión debe seguir
    // funcionando igual.
    console.error('Error al registrar el identificador de sesión:', error)
    return NextResponse.json({ ok: true, registrada: false })
  }

  const response = NextResponse.json({ ok: true, registrada: true })
  response.cookies.set(COOKIE_SESION, sesionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}
