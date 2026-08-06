import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

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

    const formData = await request.formData()
    const archivo = formData.get('archivo')
    const titulo = formData.get('titulo')
    const cursoId = formData.get('cursoId')
    const moduloId = formData.get('moduloId')
    const orden = formData.get('orden')
    const esGratis = formData.get('esGratis')

    if (!(archivo instanceof File) || !titulo || !cursoId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    if (archivo.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
    }

    // Solo el docente dueño del curso (o un admin) puede subir material.
    if (rol !== 'admin') {
      const { data: curso } = await supabase
        .from('cursos')
        .select('docente_id')
        .eq('id', cursoId.toString())
        .single()

      if (!curso || curso.docente_id !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const admin = createAdminSupabaseClient()
    const ruta = `${cursoId}/${randomUUID()}-${archivo.name}`

    const { error: uploadError } = await admin.storage
      .from('materiales')
      .upload(ruta, archivo, { contentType: 'application/pdf' })

    if (uploadError) {
      console.error('Error al subir PDF:', uploadError)
      return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
    }

    const { data: leccion, error: dbError } = await admin
      .from('lecciones')
      .insert({
        curso_id: cursoId.toString(),
        modulo_id: moduloId ? moduloId.toString() : null,
        titulo: titulo.toString(),
        video_url: null,
        pdf_url: ruta,
        orden: orden ? Number(orden) : 1,
        es_gratis: esGratis === 'true',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('DB Error:', dbError)
      await admin.storage.from('materiales').remove([ruta])
      return NextResponse.json({ error: 'Error al guardar leccion' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, leccionId: leccion.id })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error al subir el material' }, { status: 500 })
  }
}
