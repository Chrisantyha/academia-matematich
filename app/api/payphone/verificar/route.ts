import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { consultarPayphone } from '@/lib/payphone'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { cursoId, paqueteId } = await request.json()

    // Buscar la(s) compra(s) pendiente(s) del alumno: por paqueteId si viene,
    // si no por cursoId (comportamiento individual de siempre)
    let compraQuery = supabase
      .from('compras')
      .select('id, payphone_transaction_id, paquete_id')
      .eq('alumno_id', user.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })

    if (paqueteId) {
      compraQuery = compraQuery.eq('paquete_id', paqueteId)
    } else {
      compraQuery = compraQuery.eq('curso_id', cursoId)
    }

    const { data: compras } = await compraQuery

    if (!compras || compras.length === 0) {
      return NextResponse.json({
        ok: false,
        error: paqueteId ? 'No hay pagos pendientes para este paquete' : 'No hay pagos pendientes para este curso'
      })
    }

    // Todas las filas de un mismo paquete comparten transaction_id; para
    // compra individual solo hay una fila. Basta consultar una vez.
    const transactionId = compras[0].payphone_transaction_id
    console.log('Consultando transaccion:', transactionId)

    // Consultar el estado en PayPhone
    const resultado = await consultarPayphone(transactionId)
    console.log('Respuesta PayPhone:', JSON.stringify(resultado))

    const estado = resultado.transactionStatus || resultado.status

    if (estado !== 'Approved') {
      return NextResponse.json({
        ok: false,
        error: 'El pago aun no ha sido aprobado',
        estado: estado || 'Desconocido'
      })
    }

    // Activar todas las compras asociadas a esta transaccion (1 si es
    // individual, N si es paquete)
    const idsAActivar = compras.map((c) => c.id)
    const { error } = await supabase
      .from('compras')
      .update({ estado: 'aprobado' })
      .in('id', idsAActivar)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error al activar el curso' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensaje: compras.length > 1 ? 'Pago confirmado. Acceso desbloqueado a todos los cursos del paquete.' : 'Pago confirmado. Acceso desbloqueado.'
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}