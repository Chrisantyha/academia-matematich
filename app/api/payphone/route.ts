import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import https from 'https'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN
const PAYPHONE_STORE_ID = process.env.PAYPHONE_STORE_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL_LOCAL

function payphoneRequest(body: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)

    const options = {
      hostname: 'pay.payphonetodoesposible.com',
      path: '/api/Links',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
      },
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => { responseData += chunk })
      res.on('end', () => resolve(responseData))
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { cursoId } = await request.json()

    if (!cursoId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { data: curso } = await supabase
      .from('cursos')
      .select('titulo, precio')
      .eq('id', cursoId)
      .single()

    if (!curso) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // El monto a cobrar SIEMPRE se calcula desde el precio real en la base de
    // datos. Nunca se confía en un "monto" enviado por el cliente.
    const precio = Number(curso.precio)
    if (!Number.isFinite(precio) || precio <= 0) {
      return NextResponse.json({ error: 'El curso no tiene un precio válido' }, { status: 400 })
    }

    const { data: compraExistente } = await supabase
      .from('compras')
      .select('id, estado')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .eq('estado', 'aprobado')
      .single()

    if (compraExistente) {
      return NextResponse.json({ error: 'Ya tienes este curso' }, { status: 400 })
    }

    const clientTransactionId = `AM${Math.floor(Date.now() / 1000)}`
    const montoEnCentavos = Math.round(precio * 100)

    const body = {
      amount: montoEnCentavos,
      amountWithoutTax: montoEnCentavos,
      amountWithTax: 0,
      tax: 0,
      service: 0,
      tip: 0,
      clientTransactionId,
      currency: 'USD',
      storeId: PAYPHONE_STORE_ID,
      reference: `Curso ${cursoId.slice(0, 8)}`,
      responseUrl: `${APP_URL}/pago/confirmacion`,
      cancellationUrl: `${APP_URL}/cursos/${cursoId}`,
      oneTime: true,
      expireIn: null,
      isAmountEditable: false,
      additionalData: null,
      transferTo: null
    }

    const paymentUrl = await payphoneRequest(body)
    console.log('PayPhone response:', paymentUrl)

    if (!paymentUrl || paymentUrl.includes('<!DOCTYPE') || paymentUrl.includes('"message"')) {
      return NextResponse.json({ error: `Error PayPhone: ${paymentUrl}` }, { status: 500 })
    }

    const cleanUrl = paymentUrl.replace(/"/g, '')

    // Borrar compras pendientes anteriores de este curso
    await supabase
      .from('compras')
      .delete()
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .eq('estado', 'pendiente')

    // Guardar nueva compra pendiente
    await supabase.from('compras').insert({
      alumno_id: user.id,
      curso_id: cursoId,
      monto: precio,
      estado: 'pendiente',
      payphone_transaction_id: clientTransactionId,
    })

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