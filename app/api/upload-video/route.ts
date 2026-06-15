import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const video = formData.get('video') as File
    const titulo = formData.get('titulo') as string
    const cursoId = formData.get('cursoId') as string
    const moduloId = formData.get('moduloId') as string
    const orden = parseInt(formData.get('orden') as string) || 1
    const esGratis = formData.get('esGratis') === 'true'

    if (!video) {
      return NextResponse.json({ error: 'No se recibio video' }, { status: 400 })
    }

    // Paso 1: Crear upload en Cloudflare Stream
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
          meta: { name: titulo || video.name },
          requireSignedURLs: false,
        }),
      }
    )

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ error: data.errors }, { status: 500 })
    }

    // Paso 2: Subir video a Cloudflare
    const uploadForm = new FormData()
    uploadForm.append('file', video)

    await fetch(data.result.uploadURL, {
      method: 'POST',
      body: uploadForm,
    })

    // Paso 3: Guardar leccion en Supabase
    const supabase = await createServerSupabaseClient()

    const { error: dbError } = await supabase
      .from('lecciones')
      .insert({
        curso_id: cursoId,
        modulo_id: moduloId || null,
        titulo: titulo,
        video_url: data.result.uid,
        orden: orden,
        es_gratis: esGratis,
      })

    if (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json({ error: 'Error al guardar leccion' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      videoId: data.result.uid,
    })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error al subir video' }, { status: 500 })
  }
}