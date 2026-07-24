import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function borrarVideoCloudflare(uid: string) {
  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    )
  } catch (err) {
    console.error(`Error al borrar video ${uid} en Cloudflare:`, err)
  }
}

export async function DELETE(
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

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = perfil?.rol || 'alumno'

    if (rol !== 'docente' && rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: leccion } = await supabase
      .from('lecciones')
      .select('id, video_url, curso_id')
      .eq('id', id)
      .single()

    if (!leccion) {
      return NextResponse.json({ error: 'Leccion no encontrada' }, { status: 404 })
    }

    // Solo el docente dueño del curso (o un admin) puede borrar la leccion.
    if (rol !== 'admin') {
      const { data: curso } = await supabase
        .from('cursos')
        .select('docente_id')
        .eq('id', leccion.curso_id)
        .single()

      if (!curso || curso.docente_id !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Borrar el video en Cloudflare Stream antes de borrar la fila, para no
    // dejar el uid huerfano sin ninguna referencia en nuestra base de datos.
    if (leccion.video_url) {
      await borrarVideoCloudflare(leccion.video_url)
    }

    const { error: deleteError } = await supabase
      .from('lecciones')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error al borrar leccion:', deleteError)
      return NextResponse.json({ error: 'Error al borrar la leccion' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error al borrar la leccion' }, { status: 500 })
  }
}
