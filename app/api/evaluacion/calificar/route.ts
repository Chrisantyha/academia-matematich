import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { esDocenteOAdminDelCurso } from '@/lib/acceso'
import { parseNumeroOFraccion } from '@/lib/numero'
import { normalizarTextoAlgebraico, normalizarRadical } from '@/lib/plantillas'

interface PreguntaSnapshot {
  pregunta_id: string
  tipo: string
  respuesta_correcta: string | { x: number; y: number }
  tolerancia: number
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { intentoId, respuestas } = await request.json()

    if (!intentoId || !respuestas) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { data: intento } = await supabase
      .from('intentos')
      .select('id, evaluacion_id, alumno_id, preguntas')
      .eq('id', intentoId)
      .single()

    if (!intento) {
      return NextResponse.json({ error: 'Intento no encontrado' }, { status: 404 })
    }

    if (intento.alumno_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: yaCalificado } = await supabase
      .from('resultados_evaluacion')
      .select('id')
      .eq('intento_id', intento.id)
      .maybeSingle()

    if (yaCalificado) {
      return NextResponse.json({ error: 'Este intento ya fue calificado' }, { status: 400 })
    }

    const { data: evaluacion } = await supabase
      .from('evaluaciones')
      .select('id, nota_minima, curso_id')
      .eq('id', intento.evaluacion_id)
      .single()

    if (!evaluacion) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }

    const esDocenteAdmin = await esDocenteOAdminDelCurso(supabase, user.id, evaluacion.curso_id)
    const preguntas = intento.preguntas as PreguntaSnapshot[]

    let correctas = 0
    for (const p of preguntas) {
      const respuestaAlumno = respuestas[p.pregunta_id]
      if (respuestaAlumno === undefined || respuestaAlumno === null) continue

      if (p.tipo === 'numerica') {
        if (respuestaAlumno === '') continue
        const respNum = parseNumeroOFraccion(String(respuestaAlumno))
        const correctaNum = parseNumeroOFraccion(String(p.respuesta_correcta))
        if (respNum !== null && correctaNum !== null && Math.abs(respNum - correctaNum) <= (p.tolerancia || 0)) {
          correctas++
        }
      } else if (p.tipo === 'par_numerico') {
        const correctaPar = p.respuesta_correcta as { x: number; y: number }
        const respX = parseNumeroOFraccion(String(respuestaAlumno?.x ?? ''))
        const respY = parseNumeroOFraccion(String(respuestaAlumno?.y ?? ''))
        if (
          respX !== null && respY !== null &&
          Math.abs(respX - correctaPar.x) <= (p.tolerancia || 0) &&
          Math.abs(respY - correctaPar.y) <= (p.tolerancia || 0)
        ) {
          correctas++
        }
      } else if (p.tipo === 'texto_algebraico') {
        if (respuestaAlumno === '') continue
        if (normalizarTextoAlgebraico(String(respuestaAlumno)) === normalizarTextoAlgebraico(String(p.respuesta_correcta))) {
          correctas++
        }
      } else if (p.tipo === 'radical') {
        if (respuestaAlumno === '') continue
        if (normalizarRadical(String(respuestaAlumno)) === normalizarRadical(String(p.respuesta_correcta))) {
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

    if (!esDocenteAdmin) {
      const { error: insertError } = await supabase.from('resultados_evaluacion').insert({
        alumno_id: user.id,
        evaluacion_id: intento.evaluacion_id,
        intento_id: intento.id,
        respuestas,
        puntaje,
        aprobado,
      })

      if (insertError) {
        console.error('Error al guardar resultado:', insertError)
        return NextResponse.json({ error: 'Error al guardar el resultado' }, { status: 500 })
      }
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
