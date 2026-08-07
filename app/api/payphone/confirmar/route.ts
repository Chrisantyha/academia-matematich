import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import https from 'https'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN

function confirmarPayphone(id: string, clientTransactionId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ id, clientTxId: clientTransactionId })

    const options = {
      hostname: 'pay.payphonetodoesposible.com',
      path: '/api/button/V2/Confirm',
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData))
        } catch {
          resolve({ error: responseData })
        }
      })
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

    const { id, clientTransactionId } = await request.json()

    if (!id || !clientTransactionId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    console.log('Confirmando pago:', { id, clientTransactionId })

    // Verificar que la compra pertenezca al usuario autenticado, y traer
    // el monto que se fijo honestamente al momento de generar el link.
    // Este es el valor de referencia contra el que vamos a comparar lo
    // que PayPhone diga que realmente se pago.
    const { data: compraExistente } = await supabase
      .from('compras')
      .select('alumno_id, monto, curso_id')
      .eq('payphone_transaction_id', clientTransactionId)
      .single()

    if (!compraExistente || compraExistente.alumno_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Preguntar a PayPhone si el pago fue aprobado
    const resultado = await confirmarPayphone(id, clientTransactionId)
    console.log('Respuesta PayPhone:', resultado)

    if (resultado.transactionStatus !== 'Approved') {
      return NextResponse.json({
        ok: false,
        error: 'Pago no aprobado',
        estado: resultado.transactionStatus
      })
    }

    // Validar el monto: el precio esperado (guardado al generar el link)
    // debe coincidir con lo que PayPhone confirma que realmente se cobro.
    // PayPhone reporta el monto en centavos, por eso multiplicamos por 100.
    const montoEsperadoCentavos = Math.round(Number(compraExistente.monto) * 100)
    const montoPagadoCentavos = Number(resultado.amount)

    if (!Number.isFinite(montoPagadoCentavos) || montoPagadoCentavos !== montoEsperadoCentavos) {
      console.error('Alerta: monto pagado no coincide con el esperado', {
        clientTransactionId,
        cursoId: compraExistente.curso_id,
        alumnoId: user.id,
        montoEsperadoCentavos,
        montoPagadoCentavos,
      })

      // Marcamos la compra como rechazada en lugar de aprobarla, para
      // dejar rastro de que hubo una discrepancia de monto.
      await supabase
        .from('compras')
        .update({ estado: 'rechazado' })
        .eq('payphone_transaction_id', clientTransactionId)
        .eq('alumno_id', user.id)

      return NextResponse.json({
        ok: false,
        error: 'El monto del pago no coincide con el precio del curso. Contacta soporte.'
      }, { status: 400 })
    }

    // Actualizar la compra a aprobada
    const { data: compra, error } = await supabase
      .from('compras')
      .update({
        estado: 'aprobado',
        payphone_transaction_id: String(id),
      })
      .eq('payphone_transaction_id', clientTransactionId)
      .eq('alumno_id', user.id)
      .select('curso_id')
      .single()

    if (error) {
      console.error('Error al actualizar compra:', error)
      return NextResponse.json({ error: 'Error al registrar compra' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      cursoId: compra?.curso_id,
      mensaje: 'Compra confirmada'
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}