import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import https from 'https'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN

function consultarPayphone(clientTransactionId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ clientTxId: clientTransactionId })

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

    const { cursoId } = await request.json()

    // Buscar la compra pendiente del alumno
    const { data: compra } = await supabase
      .from('compras')
      .select('id, payphone_transaction_id')
      .eq('alumno_id', user.id)
      .eq('curso_id', cursoId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!compra) {
      return NextResponse.json({
        ok: false,
        error: 'No hay pagos pendientes para este curso'
      })
    }

    console.log('Consultando transaccion:', compra.payphone_transaction_id)

    // Consultar el estado en PayPhone
    const resultado = await consultarPayphone(compra.payphone_transaction_id)
    console.log('Respuesta PayPhone:', JSON.stringify(resultado))

    const estado = resultado.transactionStatus || resultado.status

    if (estado !== 'Approved') {
      return NextResponse.json({
        ok: false,
        error: 'El pago aun no ha sido aprobado',
        estado: estado || 'Desconocido'
      })
    }

    // Activar la compra
    const { error } = await supabase
      .from('compras')
      .update({ estado: 'aprobado' })
      .eq('id', compra.id)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Error al activar el curso' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Pago confirmado. Acceso desbloqueado.'
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}