import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { tieneAccesoCurso } from '@/lib/acceso'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { leccionId } = await request.json()

    if (!leccionId) {
      return NextResponse.json({ error: 'leccionId es requerido' }, { status: 400 })
    }

    const { data: leccion } = await supabase
      .from('lecciones')
      .select('curso_id')
      .eq('id', leccionId)
      .single()

    if (!leccion) {
      return NextResponse.json({ error: 'Leccion no encontrada' }, { status: 404 })
    }

    const autorizado = await tieneAccesoCurso(supabase, user.id, leccion.curso_id)
    if (!autorizado) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    const { error } = await supabase
      .from('progreso')
      .upsert({
        alumno_id: user.id,
        leccion_id: leccionId,
        completado: true
      })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('progreso')
      .select('leccion_id, completado')
      .eq('alumno_id', user.id)
      .eq('completado', true)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error al obtener progreso' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, progreso: data })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}