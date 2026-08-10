import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
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

    const { cursoIds } = await request.json()

    if (!Array.isArray(cursoIds) || cursoIds.length === 0) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // Sin duplicados, por si el cliente manda el mismo id dos veces
    const idsUnicos = [...new Set(cursoIds)] as string[]

    // Configuracion de oferta vigente (minimo de cursos y % de descuento).
    // Se usa el cliente admin porque RLS solo permite leer esta tabla a
    // usuarios con rol admin, pero cualquier alumno autenticado necesita
    // conocer el descuento vigente para comprar un paquete.
    const admin = createAdminSupabaseClient()
    const { data: configuracion } = await admin
      .from('configuracion_ofertas')
      .select('descuento_paquete_porcentaje, paquete_min_cursos')
      .eq('id', 1)
      .single()

    if (!configuracion) {
      return NextResponse.json({ error: 'No se pudo cargar la configuración de ofertas' }, { status: 500 })
    }

    if (idsUnicos.length < configuracion.paquete_min_cursos) {
      return NextResponse.json({
        error: `Selecciona al menos ${configuracion.paquete_min_cursos} cursos para aplicar el descuento de paquete`,
      }, { status: 400 })
    }

    // El precio de cada curso SIEMPRE se calcula desde la base de datos.
    // Nunca se confia en montos o porcentajes enviados por el cliente.
    const { data: cursos } = await supabase
      .from('cursos')
      .select('id, titulo, precio')
      .in('id', idsUnicos)
      .eq('estado', 'publicado')

    if (!cursos || cursos.length !== idsUnicos.length) {
      return NextResponse.json({ error: 'Uno o más cursos seleccionados ya no están disponibles' }, { status: 400 })
    }

    // El alumno no puede volver a comprar un curso que ya tiene aprobado
    const { data: comprasAprobadas } = await supabase
      .from('compras')
      .select('curso_id')
      .eq('alumno_id', user.id)
      .eq('estado', 'aprobado')
      .in('curso_id', idsUnicos)

    if (comprasAprobadas && comprasAprobadas.length > 0) {
      return NextResponse.json({ error: 'Ya tienes uno o más de estos cursos. Ajusta tu selección.' }, { status: 400 })
    }

    const subtotal = cursos.reduce((acc, c) => acc + Number(c.precio), 0)
    const descuento = subtotal * (Number(configuracion.descuento_paquete_porcentaje) / 100)
    const total = Math.round((subtotal - descuento) * 100) / 100

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'El total calculado no es válido' }, { status: 400 })
    }

    const clientTransactionId = `AMP${Math.floor(Date.now() / 1000)}`
    const montoEnCentavos = Math.round(total * 100)
    const paqueteId = crypto.randomUUID()

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
      reference: `Paquete de ${idsUnicos.length} cursos`,
      responseUrl: `${APP_URL}/pago/confirmacion`,
      cancellationUrl: `${APP_URL}/cursos`,
      oneTime: true,
      expireIn: null,
      isAmountEditable: false,
      additionalData: null,
      transferTo: null
    }

    const paymentUrl = await payphoneRequest(body)
    console.log('PayPhone response (paquete):', paymentUrl)

    if (!paymentUrl || paymentUrl.includes('<!DOCTYPE') || paymentUrl.includes('"message"')) {
      return NextResponse.json({ error: `Error PayPhone: ${paymentUrl}` }, { status: 500 })
    }

    const cleanUrl = paymentUrl.replace(/"/g, '')

    // Borrar compras pendientes anteriores de estos mismos cursos para este alumno
    await supabase
      .from('compras')
      .delete()
      .eq('alumno_id', user.id)
      .in('curso_id', idsUnicos)
      .eq('estado', 'pendiente')

    // Una fila de compra pendiente por curso, todas compartiendo
    // payphone_transaction_id y paquete_id para poder aprobarlas juntas
    const filas = cursos.map((c) => ({
      alumno_id: user.id,
      curso_id: c.id,
      monto: Number(c.precio) * (1 - Number(configuracion.descuento_paquete_porcentaje) / 100),
      estado: 'pendiente',
      payphone_transaction_id: clientTransactionId,
      paquete_id: paqueteId,
    }))

    const { error: errorInsert } = await supabase.from('compras').insert(filas)

    if (errorInsert) {
      console.error(errorInsert)
      return NextResponse.json({ error: 'Error al registrar la compra' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      paymentUrl: cleanUrl,
      clientTransactionId,
      paqueteId,
      subtotal,
      descuento,
      total,
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}