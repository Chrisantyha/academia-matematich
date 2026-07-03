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

    // Verificar que no tenga el curso YA APROBADO
    const { data: compraAprobada } = await supabase
      .from('compras')
      .select('id')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .eq('estado', 'aprobado')
      .maybeSingle()

    if (compraAprobada) {
      return NextResponse.json({ error: 'Ya tienes este curso' }, { status: 400 })
    }

    // Si hay una compra pendiente anterior de este mismo alumno/curso,
    // la reutilizamos (evita filas duplicadas por reintentos)
    const { data: compraPendiente } = await supabase
      .from('compras')
      .select('id')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .eq('estado', 'pendiente')
      .maybeSingle()

    // ID único de transacción (máximo 15 caracteres, sin guiones)
    const timestamp = Date.now().toString().slice(-8)
    const clientTransactionId = `AM${timestamp}${Math.floor(Math.random() * 9999)}`

    if (compraPendiente) {
      // Actualizamos la fila pendiente existente con el nuevo intento de pago
      await supabase
        .from('compras')
        .update({
          monto,
          payphone_transaction_id: clientTransactionId,
        })
        .eq('id', compraPendiente.id)
    } else {
      // Creamos la fila pendiente por primera vez
      await supabase.from('compras').insert({
        alumno_id: user.id,
        curso_id: cursoId,
        monto: monto,
        estado: 'pendiente',
        payphone_transaction_id: clientTransactionId,
      })
    }

    const montoEnCentavos = Math.round(monto * 100)

    // Crear link de pago en PayPhone
    const response = await fetch('https://pay.payphonetodoesposible.com/api/Links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: montoEnCentavos,
        amountWithoutTax: montoEnCentavos,
        currency: 'USD',
        clientTransactionId,
        reference: `Curso: ${curso.titulo}`,
        storeId: PAYPHONE_STORE_ID,
        oneTime: true,
      }),
    })

    // PayPhone devuelve un string con la URL
    const paymentUrl = await response.text()
    console.log('PayPhone response:', paymentUrl)

    if (!paymentUrl || paymentUrl.includes('error') || paymentUrl.startsWith('{')) {
      console.error('PayPhone error:', paymentUrl)
      // No dejamos una fila pendiente "huérfana" apuntando a un link que nunca se creó
      await supabase
        .from('compras')
        .update({ estado: 'rechazado' })
        .eq('alumno_id', user.id)
        .eq('curso_id', cursoId)
        .eq('payphone_transaction_id', clientTransactionId)

      return NextResponse.json({ error: 'Error al crear link de pago' }, { status: 500 })
    }

    // Limpiar comillas si las tiene
    const cleanUrl = paymentUrl.replace(/"/g, '')

    return NextResponse.json({
      ok: true,
      paymentUrl: cleanUrl,
      clientTransactionId,
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
