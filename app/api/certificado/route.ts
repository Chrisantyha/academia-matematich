import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { tieneAccesoCurso } from '@/lib/acceso'
import { enviarEmail } from '@/lib/email/enviar'
import { plantillaCertificado } from '@/lib/email/plantillas/certificado'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { cursoId } = await request.json()
    if (!cursoId) {
      return NextResponse.json({ error: 'cursoId es requerido' }, { status: 400 })
    }
    const autorizado = await tieneAccesoCurso(supabase, user.id, cursoId)
    if (!autorizado) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }
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
    // Un curso sin lecciones no puede emitir certificado ("every" sobre una
    // lista vacía da true).
    if (leccionIds.length === 0) {
      return NextResponse.json({
        error: 'Este curso todavía no tiene lecciones'
      }, { status: 400 })
    }
    const todasCompletadas = leccionIds.every(id => completadasIds.includes(id))
    if (!todasCompletadas) {
      return NextResponse.json({ 
        error: 'Debes completar todas las lecciones primero' 
      }, { status: 400 })
    }
    // Si el curso tiene examen final (evaluación sin modulo_id), debe estar
    // aprobado. Antes esto solo lo revisaba el navegador (LeccionPlayer), así
    // que llamando a esta ruta directamente se podía saltar el examen.
    const { data: examenFinal, error: examenError } = await supabase
      .from('evaluaciones')
      .select('id')
      .eq('curso_id', cursoId)
      .is('modulo_id', null)
      .limit(1)
      .maybeSingle()
    if (examenError) {
      console.error('Error al buscar el examen final:', examenError)
      return NextResponse.json({ error: 'Error al verificar el examen final' }, { status: 500 })
    }
    if (examenFinal) {
      const { data: aprobado } = await supabase
        .from('resultados_evaluacion')
        .select('id')
        .eq('evaluacion_id', examenFinal.id)
        .eq('alumno_id', user.id)
        .eq('aprobado', true)
        .limit(1)
        .maybeSingle()
      if (!aprobado) {
        return NextResponse.json({
          error: 'Debes aprobar el examen final para obtener tu certificado'
        }, { status: 400 })
      }
    }
    // Verificar que no tenga certificado ya
    const { data: certExistente } = await supabase
      .from('certificados')
      .select('id, codigo_verificacion')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .maybeSingle()
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

    // Enviar correo de certificado emitido (no bloqueante)
    if (user.email) {
      const { data: curso } = await supabase
        .from('cursos')
        .select('titulo')
        .eq('id', cursoId)
        .single()

      const { subject, html } = plantillaCertificado(curso?.titulo || 'tu curso', certificado.codigo_verificacion, certificado.id)
      enviarEmail({ to: user.email, subject, html }).catch((err) =>
        console.error('Error enviando email de certificado:', err)
      )
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