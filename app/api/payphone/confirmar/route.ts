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

    // Verificar que la compra pertenezca al usuario autenticado
    const { data: compraExistente } = await supabase
      .from('compras')
      .select('alumno_id')
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