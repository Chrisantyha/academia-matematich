import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { aprobarCompraVerificada } from '@/lib/payphone-aprobar'

// Página de retorno de PayPhone (/pago/confirmacion). Antes consultaba
// /api/button/V2/Confirm, que es del Botón de Pago; esta plataforma cobra con
// Links de Pago, así que ahora usa la misma verificación que el sondeo del
// botón de compra y que el webhook: GET /api/Sale/client/{clientTransactionId}
// (ver lib/payphone.ts y lib/payphone-aprobar.ts). Tampoco reemplaza ya el
// payphone_transaction_id de la compra, que es con lo que el webhook la busca.
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { clientTransactionId } = await request.json()

    if (!clientTransactionId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const resultado = await aprobarCompraVerificada(String(clientTransactionId), user.id, user.email)

    if (!resultado.ok) {
      // 404 = la compra no existe o no es de este usuario.
      const status = resultado.status === 404 ? 403 : resultado.status
      return NextResponse.json(
        {
          ok: false,
          error: resultado.status === 404
            ? 'No autorizado'
            : resultado.estado ? 'Pago no aprobado' : resultado.error,
          estado: resultado.estado,
        },
        { status }
      )
    }

    return NextResponse.json({
      ok: true,
      cursoId: resultado.cursoIds[0],
      mensaje: 'Compra confirmada'
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
