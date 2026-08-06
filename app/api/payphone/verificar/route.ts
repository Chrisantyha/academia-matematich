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

    const { cursoId } = await request.json()

    // Buscar la compra pendiente del alumno
    const { data: compra } = await supabase
      .from('compras')
      .select('id, payphone_transaction_id')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!compra) {
      return NextResponse.json({
        ok: false,
        error: 'No hay pagos pendientes para este curso'
      })
    }

    console.log('Consultando transaccion:', compra.payphone_transaction_id)

    // Consultar el estado en PayPhone
    const resultado = await consultarPayphone(compra.payphone_transaction_id)
    console.log('Respuesta PayPhone:', JSON.stringify(resultado))

    const estado = resultado.transactionStatus || resultado.status

    if (estado !== 'Approved') {
      return NextResponse.json({
        ok: false,
        error: 'El pago aun no ha sido aprobado',
        estado: estado || 'Desconocido'
      })
    }

    // Activar la compra
    const { error } = await supabase
      .from('compras')
      .update({ estado: 'aprobado' })
      .eq('id', compra.id)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error al activar el curso' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Pago confirmado. Acceso desbloqueado.'
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}