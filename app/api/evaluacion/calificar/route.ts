import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { evaluacionId, respuestas } = await request.json()

    if (!evaluacionId || !respuestas) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { data: evaluacion } = await supabase
      .from('evaluaciones')
      .select('id, nota_minima, intentos_permitidos, curso_id')
      .eq('id', evaluacionId)
      .single()

    if (!evaluacion) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }

    if (evaluacion.intentos_permitidos && evaluacion.intentos_permitidos > 0) {
      const { count } = await supabase
        .from('resultados_evaluacion')
        .select('id', { count: 'exact', head: true })
        .eq('alumno_id', user.id)
        .eq('evaluacion_id', evaluacionId)

      if ((count || 0) >= evaluacion.intentos_permitidos) {
        return NextResponse.json(
          { error: `Ya usaste tus ${evaluacion.intentos_permitidos} intento(s) permitido(s) para esta evaluación.` },
          { status: 403 }
        )
      }
    }

    const { data: preguntas } = await supabase
      .from('preguntas')
      .select('id, tipo, respuesta_correcta, tolerancia')
      .eq('evaluacion_id', evaluacionId)

    if (!preguntas || preguntas.length === 0) {
      return NextResponse.json({ error: 'Esta evaluación no tiene preguntas' }, { status: 400 })
    }

    let correctas = 0
    for (const p of preguntas) {
      const respuestaAlumno = respuestas[p.id]
      if (respuestaAlumno === undefined || respuestaAlumno === null || respuestaAlumno === '') continue

      if (p.tipo === 'numerica') {
        const respNum = parseFloat(respuestaAlumno)
        const correctaNum = parseFloat(p.respuesta_correcta)
        if (!isNaN(respNum) && Math.abs(respNum - correctaNum) <= (p.tolerancia || 0)) {
          correctas++
        }
      } else {
        if (respuestaAlumno === p.respuesta_correcta) {
          correctas++
        }
      }
    }

    const total = preguntas.length
    const puntaje = Math.round((correctas / total) * 100)
    const aprobado = puntaje >= (evaluacion.nota_minima || 70)

    const { error: insertError } = await supabase.from('resultados_evaluacion').insert({
      alumno_id: user.id,
      evaluacion_id: evaluacionId,
      respuestas,
      puntaje,
      aprobado,
    })

    if (insertError) {
      console.error('Error al guardar resultado:', insertError)
      return NextResponse.json({ error: 'Error al guardar el resultado' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      puntaje,
      aprobado,
      correctas,
      total,
      notaMinima: evaluacion.nota_minima,
      cursoId: evaluacion.curso_id,
    })

  } catch (error) {
    console.error('Error al calificar evaluación:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
