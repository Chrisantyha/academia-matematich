import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = perfil?.rol || 'alumno'

    if (rol !== 'docente' && rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()

    // Paso 2 (se llama despues de subir el archivo directo a Cloudflare desde
    // el navegador): guardar la leccion en la base de datos.
    if (body.action === 'guardar') {
      const { videoId, titulo, cursoId, moduloId, orden, esGratis } = body

      if (!videoId || !cursoId || !titulo) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
      }

      const { error: dbError } = await supabase
        .from('lecciones')
        .insert({
          curso_id: cursoId,
          modulo_id: moduloId || null,
          titulo,
          video_url: videoId,
          orden: orden || 1,
          es_gratis: !!esGratis,
        })

      if (dbError) {
        console.error('DB Error:', dbError)
        return NextResponse.json({ error: 'Error al guardar leccion' }, { status: 500 })
      }

      return NextResponse.json({ ok: true, videoId })
    }

    // Paso 1: pedir a Cloudflare Stream una URL de "Direct Creator Upload".
    // El archivo ya no pasa por esta API route (evita el limite de tamano de
    // body de Vercel) — el navegador sube el video directo a Cloudflare.
    const { titulo } = body

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 7200,
          meta: { name: titulo || 'video' },
          requireSignedURLs: false,
        }),
      }
    )

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ error: data.errors }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      uploadURL: data.result.uploadURL,
      videoId: data.result.uid,
    })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error al subir video' }, { status: 500 })
  }
}