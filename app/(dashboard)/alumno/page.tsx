import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('PayPhone webhook recibido:', body)

    const { clientTransactionId, transactionStatus, id } = body

    const supabase = await createServerSupabaseClient()

    // Verificar que el pago fue aprobado
    if (transactionStatus !== 'Approved') {
      await supabase
        .from('compras')
        .update({ estado: 'rechazado' })
        .eq('payphone_transaction_id', clientTransactionId)

      return NextResponse.json({ ok: false, message: 'Pago no aprobado' })
    }

    // Verificar transacción con PayPhone (para evitar webhooks falsos)
    const verifyResponse = await fetch(
      `https://pay.payphonetodoesposible.com/api/button/V2/Confirm`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          clientTransactionId,
        }),
      }
    )

    const verifyData = await verifyResponse.json()
    console.log('PayPhone verificacion:', verifyData)

    if (verifyData.transactionStatus !== 'Approved') {
      await supabase
        .from('compras')
        .update({ estado: 'rechazado' })
        .eq('payphone_transaction_id', clientTransactionId)

      return NextResponse.json({ ok: false, message: 'Verificacion fallida' })
    }

    // Buscar la compra pendiente por el ID de transacción que YA guardamos
    // al crear el link de pago (en vez de intentar parsear alumnoId/cursoId
    // desde el clientTransactionId, que nunca los contuvo)
    const { data: compra, error: buscarError } = await supabase
      .from('compras')
      .select('id, estado')
      .eq('payphone_transaction_id', clientTransactionId)
      .maybeSingle()

    if (buscarError || !compra) {
      console.error('No se encontró la compra para clientTransactionId:', clientTransactionId)
      return NextResponse.json({ ok: false, message: 'Compra no encontrada' }, { status: 404 })
    }

    if (compra.estado === 'aprobado') {
      return NextResponse.json({ ok: true, message: 'Compra ya registrada' })
    }

    const monto = verifyData.amount / 100

    const { error } = await supabase
      .from('compras')
      .update({
        estado: 'aprobado',
        monto,
      })
      .eq('id', compra.id)

    if (error) {
      console.error('Error al registrar compra:', error)
      return NextResponse.json({ ok: false, message: 'Error al registrar compra' }, { status: 500 })
    }

    console.log('Compra registrada exitosamente')
    return NextResponse.json({ ok: true, message: 'Compra registrada' })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}