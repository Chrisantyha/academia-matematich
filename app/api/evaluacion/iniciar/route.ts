import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { tieneAccesoCurso, esDocenteOAdminDelCurso } from '@/lib/acceso'
import { generarPlantilla } from '@/lib/plantillas'

interface PreguntaSnapshot {
  pregunta_id: string
  orden: number
  tipo: string
  pregunta_texto: string
  opciones: string[] | null
  respuesta_correcta:
    | string
    | { x: number; y: number }
    | { x1: number; x2: number }
    | { numerador: string; denominador: string }
  tolerancia: number
  valores_generados: Record<string, number> | null
}

function barajar<T>(arr: T[]): T[] {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function sinRespuestaCorrecta(preguntas: PreguntaSnapshot[]) {
  return preguntas.map((p) => ({
    id: p.pregunta_id,
    orden: p.orden,
    tipo: p.tipo,
    pregunta: p.pregunta_texto,
    opciones: p.opciones,
    tolerancia: p.tolerancia,
  }))
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { evaluacionId } = await request.json()

    if (!evaluacionId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { data: evaluacion } = await supabase
      .from('evaluaciones')
      .select('id, titulo, curso_id, intentos_permitidos, cantidad_a_mostrar')
      .eq('id', evaluacionId)
      .single()

    if (!evaluacion) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }

    const esDocenteAdmin = await esDocenteOAdminDelCurso(supabase, user.id, evaluacion.curso_id)
    const autorizado = esDocenteAdmin || await tieneAccesoCurso(supabase, user.id, evaluacion.curso_id)
    if (!autorizado) {
      return NextResponse.json(
        { error: 'No tienes acceso a este curso', motivo: 'sin_acceso', cursoId: evaluacion.curso_id },
        { status: 403 }
      )
    }

    // Si ya hay un intento sin calificar, se reutiliza tal cual (evita "pescar"
    // preguntas/valores más fáciles refrescando la página).
    const { data: ultimoIntento } = await supabase
      .from('intentos')
      .select('id, preguntas')
      .eq('alumno_id', user.id)
      .eq('evaluacion_id', evaluacionId)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ultimoIntento) {
      const { data: yaCalificado } = await supabase
        .from('resultados_evaluacion')
        .select('id')
        .eq('intento_id', ultimoIntento.id)
        .maybeSingle()

      if (!yaCalificado) {
        return NextResponse.json({
          ok: true,
          intentoId: ultimoIntento.id,
          esDocenteAdmin,
          evaluacion: { id: evaluacion.id, titulo: evaluacion.titulo, curso_id: evaluacion.curso_id },
          preguntas: sinRespuestaCorrecta(ultimoIntento.preguntas as PreguntaSnapshot[]),
        })
      }
    }

    // No hay intento pendiente: esto es un intento nuevo, ahí sí aplica el límite.
    if (!esDocenteAdmin && evaluacion.intentos_permitidos && evaluacion.intentos_permitidos > 0) {
      const { count } = await supabase
        .from('resultados_evaluacion')
        .select('id', { count: 'exact', head: true })
        .eq('alumno_id', user.id)
        .eq('evaluacion_id', evaluacionId)

      if ((count || 0) >= evaluacion.intentos_permitidos) {
        return NextResponse.json(
          {
            error: `Ya usaste tus ${evaluacion.intentos_permitidos} intento(s) permitido(s) para esta evaluación.`,
            motivo: 'sin_intentos',
            cursoId: evaluacion.curso_id,
          },
          { status: 403 }
        )
      }
    }

    const { data: banco } = await supabase
      .from('preguntas')
      .select('id, tipo, pregunta, opciones, respuesta_correcta, tolerancia, es_plantilla, tipo_plantilla, parametros')
      .eq('evaluacion_id', evaluacionId)

    if (!banco || banco.length === 0) {
      return NextResponse.json({ error: 'Esta evaluación no tiene preguntas' }, { status: 400 })
    }

    const cantidad =
      evaluacion.cantidad_a_mostrar && evaluacion.cantidad_a_mostrar > 0
        ? Math.min(evaluacion.cantidad_a_mostrar, banco.length)
        : banco.length

    const seleccionadas = barajar(banco).slice(0, cantidad)

    const snapshot: PreguntaSnapshot[] = seleccionadas.map((p, index) => {
      if (p.es_plantilla) {
        const generada = generarPlantilla(p.tipo_plantilla, p.parametros)
        return {
          pregunta_id: p.id,
          orden: index,
          tipo: p.tipo,
          pregunta_texto: generada.preguntaTexto,
          opciones: null,
          respuesta_correcta: generada.respuestaCorrecta,
          tolerancia: generada.tolerancia,
          valores_generados: generada.valoresGenerados,
        }
      }

      return {
        pregunta_id: p.id,
        orden: index,
        tipo: p.tipo,
        pregunta_texto: p.pregunta,
        opciones: p.opciones,
        respuesta_correcta: p.respuesta_correcta,
        tolerancia: p.tolerancia,
        valores_generados: null,
      }
    })

    const { data: nuevoIntento, error: insertError } = await supabase
      .from('intentos')
      .insert({ evaluacion_id: evaluacionId, alumno_id: user.id, preguntas: snapshot })
      .select('id')
      .single()

    if (insertError || !nuevoIntento) {
      console.error('Error al crear intento:', insertError)
      return NextResponse.json({ error: 'Error al iniciar la evaluación' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      intentoId: nuevoIntento.id,
      esDocenteAdmin,
      evaluacion: { id: evaluacion.id, titulo: evaluacion.titulo, curso_id: evaluacion.curso_id },
      preguntas: sinRespuestaCorrecta(snapshot),
    })

  } catch (error) {
    console.error('Error al iniciar evaluación:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
