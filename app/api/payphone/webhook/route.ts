import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('PayPhone webhook recibido:', body)

    const { clientTransactionId, transactionStatus, id } = body

    // Verificar que el pago fue aprobado
    if (transactionStatus !== 'Approved') {
      return NextResponse.json({ ok: false, message: 'Pago no aprobado' })
    }

    // Verificar transaccion con PayPhone
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
      return NextResponse.json({ ok: false, message: 'Verificacion fallida' })
    }

    // Extraer alumnoId y cursoId del clientTransactionId
    // formato: alumnoId-cursoId-timestamp
    const partes = clientTransactionId.split('-')
    // UUID tiene 5 partes separadas por guion
    const alumnoId = partes.slice(0, 5).join('-')
    const cursoId = partes.slice(5, 10).join('-')
    const monto = verifyData.amount / 100

    const supabase = await createServerSupabaseClient()

    // Verificar que no exista la compra
    const { data: compraExistente } = await supabase
      .from('compras')
      .select('id')
      .eq('alumno_id', alumnoId)
      .eq('curso_id', cursoId)
      .single()

    if (compraExistente) {
      return NextResponse.json({ ok: true, message: 'Compra ya registrada' })
    }

    // Registrar compra en Supabase
    const { error } = await supabase
      .from('compras')
      .insert({
        alumno_id: alumnoId,
        curso_id: cursoId,
        monto,
        stripe_payment_id: String(id),
      })

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