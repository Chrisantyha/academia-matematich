import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { enviarEmail } from '@/lib/email/enviar'
import { plantillaRecordatorio } from '@/lib/email/plantillas/recordatorio'

export async function GET(request: Request) {
  // Protección: solo Vercel Cron (o quien tenga el secreto) puede disparar esto
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminSupabaseClient()
  const ahora = Date.now()
  const hace7dias = new Date(ahora - 7 * 24 * 60 * 60 * 1000).toISOString()
  const hace14dias = new Date(ahora - 14 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Compras aprobadas: alumno + curso
    const { data: compras, error: comprasError } = await supabase
      .from('compras')
      .select('alumno_id, curso_id')
      .eq('estado', 'aprobado')

    if (comprasError) {
      console.error('Cron recordatorio: error obteniendo compras', comprasError)
      return NextResponse.json({ error: 'Error obteniendo compras' }, { status: 500 })
    }

    let enviados = 0
    let evaluados = 0

    for (const compra of compras ?? []) {
      evaluados++
      // Lecciones del curso
      const { data: lecciones } = await supabase
        .from('lecciones')
        .select('id')
        .eq('curso_id', compra.curso_id)

      const leccionIds = (lecciones ?? []).map((l) => l.id)
      if (leccionIds.length === 0) continue

      // Última actividad del alumno en ese curso
      const { data: progresoReciente } = await supabase
        .from('progreso')
        .select('created_at')
        .eq('alumno_id', compra.alumno_id)
        .in('leccion_id', leccionIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!progresoReciente) continue // nunca empezó -> no aplica (solo inactividad, no "nunca inició")

      const ultimaActividad = progresoReciente.created_at
      const enVentanaInactividad = ultimaActividad <= hace7dias && ultimaActividad > hace14dias

      if (!enVentanaInactividad) continue

      const { data: alumno } = await supabase.auth.admin.getUserById(compra.alumno_id)
      const emailAlumno = alumno?.user?.email
      if (!emailAlumno) continue

      const { data: curso } = await supabase
        .from('cursos')
        .select('titulo')
        .eq('id', compra.curso_id)
        .single()

      const { subject, html } = plantillaRecordatorio(curso?.titulo || 'tu curso')
      const resultado = await enviarEmail({ to: emailAlumno, subject, html })
      if (resultado.success) enviados++
    }

    console.log(`Cron recordatorio: evaluados=${evaluados} enviados=${enviados}`)
    return NextResponse.json({ ok: true, evaluados, enviados })
  } catch (error) {
    console.error('Cron recordatorio: error inesperado', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}