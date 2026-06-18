import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN
const PAYPHONE_STORE_ID = process.env.PAYPHONE_STORE_ID

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { cursoId, monto } = await request.json()

    if (!cursoId || !monto) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // Obtener datos del curso
    const { data: curso } = await supabase
      .from('cursos')
      .select('titulo, precio')
      .eq('id', cursoId)
      .single()

    if (!curso) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // Verificar que no tenga el curso ya
    const { data: compraExistente } = await supabase
      .from('compras')
      .select('id')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .single()

    if (compraExistente) {
      return NextResponse.json({ error: 'Ya tienes este curso' }, { status: 400 })
    }

    // ID único de transacción
    const clientTransactionId = `${user.id}-${cursoId}-${Date.now()}`

    // Crear link de pago en PayPhone
    const response = await fetch('https://pay.payphonetodoesposible.com/api/button/Cobrar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: monto * 100, // PayPhone usa centavos
        amountWithoutTax: monto * 100,
        currency: 'USD',
        clientTransactionId,
        reference: `Curso: ${curso.titulo}`,
        storeId: PAYPHONE_STORE_ID,
        responseUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/payphone/webhook`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cursos/${cursoId}`,
      }),
    })

    const data = await response.json()

    if (!data.paymentUrl) {
      console.error('PayPhone error:', data)
      return NextResponse.json({ error: 'Error al crear link de pago' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      paymentUrl: data.paymentUrl,
      clientTransactionId,
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}