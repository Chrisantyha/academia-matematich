import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const NIVELES = ['bachillerato', 'universitario', 'posgrado']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { titulo, descripcion, precio, categoria, nivel } = await request.json()

    if (!titulo || !titulo.trim() || !descripcion || !descripcion.trim()) {
      return NextResponse.json({ error: 'El titulo y la descripcion son obligatorios' }, { status: 400 })
    }

    const precioNumerico = Number(precio)
    if (!Number.isFinite(precioNumerico) || precioNumerico <= 0) {
      return NextResponse.json({ error: 'El precio debe ser un numero mayor a 0' }, { status: 400 })
    }

    if (!NIVELES.includes(nivel)) {
      return NextResponse.json({ error: 'Nivel invalido' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: categoriaValida } = await supabase
      .from('categorias')
      .select('id')
      .eq('nombre', categoria)
      .maybeSingle()

    if (!categoriaValida) {
      return NextResponse.json({ error: 'Categoria invalida' }, { status: 400 })
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

    const { data: curso } = await supabase
      .from('cursos')
      .select('id, docente_id')
      .eq('id', id)
      .single()

    if (!curso) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // Solo el docente dueño del curso (o un admin) puede editarlo.
    if (rol !== 'admin' && curso.docente_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // La policy RLS de UPDATE en "cursos" solo permite al docente dueño
    // (ver "Docente edita sus cursos"), así que un admin editando el curso
    // de otro docente necesita el cliente admin para no fallar en silencio
    // con 0 filas afectadas (mismo caso que aprobarCurso en admin/page.tsx).
    const admin = createAdminSupabaseClient()
    const { data: cursoActualizado, error: updateError } = await admin
      .from('cursos')
      .update({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        precio: precioNumerico,
        categoria,
        nivel,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error al actualizar curso:', updateError)
      return NextResponse.json({ error: 'Error al actualizar el curso' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, curso: cursoActualizado })

  } catch (error) {
    console.error('Error general al actualizar curso:', error)
    return NextResponse.json({ error: 'Error al actualizar el curso' }, { status: 500 })
  }
}
