import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { tieneAccesoCurso } from '@/lib/acceso'

// Horas de validez del enlace firmado. Alcanza para una sesión de estudio
// larga; al recargar la página se pide uno nuevo.
const HORAS_VALIDEZ = 6

// Devuelve con qué reproducir el video de una lección, SOLO si el usuario
// tiene acceso al curso (compra aprobada, o es el docente dueño / un admin).
//
// Los videos nuevos se suben a Cloudflare Stream exigiendo URL firmada (ver
// app/api/upload-video/route.ts), así que el id del video por sí solo ya no
// reproduce nada: hace falta un token temporal, que solo esta ruta entrega.
// Si Cloudflare no devuelve el token se responde con el id sin firmar, que
// sigue sirviendo para los videos antiguos subidos sin esa exigencia.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = createAdminSupabaseClient()

    const { data: leccion } = await admin
      .from('lecciones')
      .select('id, curso_id, video_url')
      .eq('id', id)
      .single()

    if (!leccion || !leccion.video_url) {
      return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 })
    }

    const tieneAcceso = await tieneAccesoCurso(supabase, user.id, leccion.curso_id, {
      permitirDocenteAdmin: true,
    })

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    let token: string | null = null

    try {
      const respuesta = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${leccion.video_url}/token`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + HORAS_VALIDEZ * 60 * 60,
          }),
        }
      )
      const datos = await respuesta.json().catch(() => null)
      token = datos?.result?.token || null

      if (!token) {
        console.error('Cloudflare no devolvió token firmado:', respuesta.status, datos?.errors)
      }
    } catch (err) {
      console.error('Error pidiendo token firmado a Cloudflare:', err)
    }

    return NextResponse.json(
      { ok: true, src: token || leccion.video_url, firmado: !!token },
      { headers: { 'Cache-Control': 'no-store' } }
    )

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error al obtener el video' }, { status: 500 })
  }
}
