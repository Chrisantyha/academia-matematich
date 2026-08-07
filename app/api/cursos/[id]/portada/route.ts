import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cursoId } = await params

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

    // Solo el docente dueño del curso (o un admin) puede cambiar su portada.
    const { data: curso } = await supabase
      .from('cursos')
      .select('docente_id, imagen_url')
      .eq('id', cursoId)
      .single()

    if (!curso) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    if (rol !== 'admin' && curso.docente_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const archivo = formData.get('archivo')

    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json(
        { error: 'La imagen debe ser JPG, PNG o WEBP' },
        { status: 400 }
      )
    }

    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      return NextResponse.json(
        { error: 'La imagen no debe superar los 5 MB' },
        { status: 400 }
      )
    }

    const admin = createAdminSupabaseClient()
    const extension = archivo.name.split('.').pop() || 'jpg'
    const ruta = `${cursoId}/${randomUUID()}.${extension}`

    const { error: uploadError } = await admin.storage
      .from('portadas')
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false })

    if (uploadError) {
      console.error('Error al subir portada:', uploadError)
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
    }

    const { data: publicUrlData } = admin.storage
      .from('portadas')
      .getPublicUrl(ruta)

    const nuevaImagenUrl = publicUrlData.publicUrl

    const { data: cursoActualizado, error: dbError } = await admin
      .from('cursos')
      .update({ imagen_url: nuevaImagenUrl })
      .eq('id', cursoId)
      .select()
      .single()

    if (dbError) {
      console.error('Error al guardar imagen_url:', dbError)
      await admin.storage.from('portadas').remove([ruta])
      return NextResponse.json({ error: 'Error al guardar la portada' }, { status: 500 })
    }

    // Si habia una portada anterior, la borramos del storage para no
    // acumular archivos huerfanos cada vez que el docente la cambia.
    if (curso.imagen_url) {
      const rutaAnterior = curso.imagen_url.split('/portadas/')[1]
      if (rutaAnterior) {
        await admin.storage.from('portadas').remove([rutaAnterior]).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, imagenUrl: nuevaImagenUrl, curso: cursoActualizado })

  } catch (error) {
    console.error('Error general al subir portada:', error)
    return NextResponse.json({ error: 'Error al subir la portada' }, { status: 500 })
  }
}