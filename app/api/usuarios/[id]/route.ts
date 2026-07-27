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

    const { data: perfilSolicitante } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfilSolicitante?.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    const { data: perfilObjetivo, error: perfilError } = await admin
      .from('perfiles')
      .select('id, rol')
      .eq('id', id)
      .maybeSingle()

    if (perfilError) {
      console.error('Error al buscar el usuario a eliminar:', perfilError)
      return NextResponse.json({ error: 'Error al buscar el usuario' }, { status: 500 })
    }

    if (!perfilObjetivo) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (perfilObjetivo.rol === 'admin') {
      return NextResponse.json({ error: 'No se puede eliminar a otro administrador' }, { status: 400 })
    }

    if (perfilObjetivo.rol === 'docente') {
      const { count: totalCursos } = await admin
        .from('cursos')
        .select('id', { count: 'exact', head: true })
        .eq('docente_id', id)

      if ((totalCursos || 0) > 0) {
        return NextResponse.json({
          error: `Este docente tiene ${totalCursos} curso(s) creados. Reasígnalos o bórralos antes de eliminar la cuenta.`,
        }, { status: 400 })
      }
    }

    // Borrado manual en orden hijo -> padre (sin asumir ON DELETE CASCADE en
    // ninguna FK, igual que en app/api/lecciones/[id] y app/api/modulos/[id]).
    const { error: progresoError } = await admin.from('progreso').delete().eq('alumno_id', id)
    if (progresoError) {
      console.error('Error al borrar progreso del usuario:', progresoError)
      return NextResponse.json({ error: 'Error al borrar el progreso del usuario' }, { status: 500 })
    }

    const { error: certificadosError } = await admin.from('certificados').delete().eq('alumno_id', id)
    if (certificadosError) {
      console.error('Error al borrar certificados del usuario:', certificadosError)
      return NextResponse.json({ error: 'Error al borrar los certificados del usuario' }, { status: 500 })
    }

    const { error: comprasError } = await admin.from('compras').delete().eq('alumno_id', id)
    if (comprasError) {
      console.error('Error al borrar compras del usuario:', comprasError)
      return NextResponse.json({ error: 'Error al borrar las compras del usuario' }, { status: 500 })
    }

    const { error: perfilDeleteError } = await admin.from('perfiles').delete().eq('id', id)
    if (perfilDeleteError) {
      console.error('Error al borrar el perfil del usuario:', perfilDeleteError)
      return NextResponse.json({ error: 'Error al borrar el perfil del usuario' }, { status: 500 })
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(id)
    if (authDeleteError) {
      console.error('Error al borrar el usuario de auth:', authDeleteError)
      return NextResponse.json({
        error: 'Se borraron el perfil y sus datos, pero falló la eliminación de la cuenta de acceso. Contacta soporte.',
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error general al borrar usuario:', error)
    return NextResponse.json({ error: 'Error al borrar el usuario' }, { status: 500 })
  }
}

const ROLES_VALIDOS = ['alumno', 'docente', 'admin']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { rol } = await request.json()

    if (!ROLES_VALIDOS.includes(rol)) {
      return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: perfilSolicitante } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfilSolicitante?.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    const { data: perfilObjetivo, error: perfilError } = await admin
      .from('perfiles')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (perfilError) {
      console.error('Error al buscar el usuario:', perfilError)
      return NextResponse.json({ error: 'Error al buscar el usuario' }, { status: 500 })
    }

    if (!perfilObjetivo) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { error: updateError } = await admin
      .from('perfiles')
      .update({ rol })
      .eq('id', id)

    if (updateError) {
      console.error('Error al cambiar el rol:', updateError)
      return NextResponse.json({ error: 'Error al cambiar el rol' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error general al cambiar rol:', error)
    return NextResponse.json({ error: 'Error al cambiar el rol' }, { status: 500 })
  }
}
