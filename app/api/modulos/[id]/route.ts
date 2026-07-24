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

    const { data: modulo } = await supabase
      .from('modulos')
      .select('id, curso_id')
      .eq('id', id)
      .single()

    if (!modulo) {
      return NextResponse.json({ error: 'Modulo no encontrado' }, { status: 404 })
    }

    // Solo el docente dueño del curso (o un admin) puede borrar el modulo.
    if (rol !== 'admin') {
      const { data: curso } = await supabase
        .from('cursos')
        .select('docente_id')
        .eq('id', modulo.curso_id)
        .single()

      if (!curso || curso.docente_id !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const { data: lecciones } = await supabase
      .from('lecciones')
      .select('id, video_url')
      .eq('modulo_id', id)

    // Borrar los videos en Cloudflare Stream antes de borrar las filas.
    await Promise.all(
      (lecciones || [])
        .filter((l) => l.video_url)
        .map((l) => borrarVideoCloudflare(l.video_url))
    )

    // lecciones.modulo_id -> modulos.id es ON DELETE NO ACTION (no CASCADE):
    // hay que borrar las lecciones del modulo manualmente antes del modulo,
    // o Postgres rechaza el DELETE por la foreign key.
    const { error: leccionesError } = await supabase
      .from('lecciones')
      .delete()
      .eq('modulo_id', id)

    if (leccionesError) {
      console.error('Error al borrar lecciones del modulo:', leccionesError)
      return NextResponse.json({
        error: 'Error al borrar el módulo',
      }, { status: 500 })
    }

    const { error: moduloError } = await supabase
      .from('modulos')
      .delete()
      .eq('id', id)

    if (moduloError) {
      console.error('Error al borrar modulo:', moduloError)
      return NextResponse.json({
        error: 'Error al borrar el módulo',
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, leccionesEliminadas: lecciones?.length || 0 })

  } catch (error) {
    console.error('Error general al borrar modulo:', error instanceof Error ? error.stack : error)
    return NextResponse.json({
      error: 'Error al borrar el módulo',
    }, { status: 500 })
  }
}
