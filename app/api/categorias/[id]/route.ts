import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

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

    if (perfil?.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const admin = createAdminSupabaseClient()

    const { data: categoria } = await admin
      .from('categorias')
      .select('id, nombre')
      .eq('id', id)
      .maybeSingle()

    if (!categoria) {
      return NextResponse.json({ error: 'Categoria no encontrada' }, { status: 404 })
    }

    const { count: cursosUsandola } = await admin
      .from('cursos')
      .select('id', { count: 'exact', head: true })
      .eq('categoria', categoria.nombre)

    if ((cursosUsandola || 0) > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: ${cursosUsandola} curso(s) usan la categoria "${categoria.nombre}".`,
      }, { status: 400 })
    }

    const { error: deleteError } = await admin
      .from('categorias')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error al borrar categoria:', deleteError)
      return NextResponse.json({ error: 'Error al borrar la categoria' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error general al borrar categoria:', error)
    return NextResponse.json({ error: 'Error al borrar la categoria' }, { status: 500 })
  }
}
