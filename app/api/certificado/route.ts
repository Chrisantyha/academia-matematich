import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { cursoId } = await request.json()

    // Verificar que el alumno completo todas las lecciones
    const { data: lecciones } = await supabase
      .from('lecciones')
      .select('id')
      .eq('curso_id', cursoId)

    const { data: progreso } = await supabase
      .from('progreso')
      .select('leccion_id')
      .eq('alumno_id', user.id)
      .eq('completado', true)

    const leccionIds = lecciones?.map(l => l.id) || []
    const completadasIds = progreso?.map(p => p.leccion_id) || []
    const todasCompletadas = leccionIds.every(id => completadasIds.includes(id))

    if (!todasCompletadas) {
      return NextResponse.json({ 
        error: 'Debes completar todas las lecciones primero' 
      }, { status: 400 })
    }

    // Verificar que no tenga certificado ya
    const { data: certExistente } = await supabase
      .from('certificados')
      .select('id, codigo_verificacion')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .single()

    if (certExistente) {
      return NextResponse.json({ 
        ok: true, 
        certificadoId: certExistente.id,
        codigo: certExistente.codigo_verificacion,
        yaExistia: true
      })
    }

    // Crear certificado
    const { data: certificado, error } = await supabase
      .from('certificados')
      .insert({
        alumno_id: user.id,
        curso_id: cursoId,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error al generar certificado' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      certificadoId: certificado.id,
      codigo: certificado.codigo_verificacion,
      yaExistia: false
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}