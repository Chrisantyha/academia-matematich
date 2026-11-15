import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { aprobarCompraVerificada } from '@/lib/payphone-aprobar'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { cursoId, paqueteId } = await request.json()

    if (!cursoId && !paqueteId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

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

    // Verificación servidor a servidor con PayPhone (estado y monto) y
    // aprobación con el cliente admin. Ver lib/payphone-aprobar.ts.
    const resultado = await aprobarCompraVerificada(transactionId, user.id, user.email)

    if (!resultado.ok) {
      return NextResponse.json(
        { ok: false, error: resultado.error, estado: resultado.estado },
        { status: resultado.status }
      )
    }

    return NextResponse.json({
      ok: true,
      mensaje: resultado.cursoIds.length > 1
        ? 'Pago confirmado. Acceso desbloqueado a todos los cursos del paquete.'
        : 'Pago confirmado. Acceso desbloqueado.'
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
