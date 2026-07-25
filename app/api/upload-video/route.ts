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

    // Paso 1: pedir a Cloudflare Stream una URL TUS de "Direct Creator Upload".
    // /stream/direct_upload (JSON) solo genera URLs de "basic upload" -- un
    // unico POST, max 200MB -- que rechazan HEAD/PATCH con 400. Para TUS hay
    // que crear el upload contra /stream?direct_user=true con headers TUS; la
    // uploadURL resultante sale en el header Location (no en el body) y sigue
    // siendo de un solo uso, segura para el navegador (sin el API token).
    const { titulo, tamano } = body

    if (!tamano) {
      return NextResponse.json({ error: 'Falta el tamano del archivo' }, { status: 400 })
    }

    const metadata = [
      `name ${Buffer.from(titulo || 'video').toString('base64')}`,
      `maxdurationseconds ${Buffer.from('7200').toString('base64')}`,
    ].join(',')

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(tamano),
          'Upload-Metadata': metadata,
        },
      }
    )

    const uploadURL = response.headers.get('Location')
    const videoId = response.headers.get('Stream-Media-ID')

    if (response.status !== 201 || !uploadURL || !videoId) {
      const detalle = await response.text().catch(() => '')
      console.error('Error al crear upload TUS en Cloudflare:', response.status, detalle)
      return NextResponse.json({ error: 'Error al iniciar la subida' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, uploadURL, videoId })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error al subir video' }, { status: 500 })
  }
}