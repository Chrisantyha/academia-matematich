import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { enviarEmail } from '@/lib/email/enviar'
import { plantillaCompra } from '@/lib/email/plantillas/compra'

const PAYPHONE_STORE_ID = process.env.PAYPHONE_STORE_ID

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch (err) {
    console.error('PayPhone webhook: no se pudo deserializar el body', err)
    return NextResponse.json({ Response: false, ErrorCode: '111' })
  }
  console.log('PayPhone webhook recibido:', body)
  try {
    const {
      Amount,
      AuthorizationCode,
      ClientTransactionId,
      StatusCode,
      TransactionStatus,
      StoreId,
      TransactionId,
    } = body ?? {}
    const missingField = [
      Amount,
      AuthorizationCode,
      ClientTransactionId,
      StatusCode,
      TransactionStatus,
      StoreId,
      TransactionId,
    ].some((value) => value === undefined || value === null || value === '')
    if (missingField) {
      console.error('PayPhone webhook: faltan campos requeridos', body)
      return NextResponse.json({ Response: false, ErrorCode: '444' })
    }
    if (StoreId !== PAYPHONE_STORE_ID) {
      console.error('PayPhone webhook: StoreId no coincide', { recibido: StoreId })
      return NextResponse.json({ Response: false, ErrorCode: '666' })
    }
    const supabase = createAdminSupabaseClient()
    const { data: compra, error: buscarError } = await supabase
      .from('compras')
      .select('id, estado, payphone_numeric_id, alumno_id, curso_id')
      .eq('payphone_transaction_id', ClientTransactionId)
      .maybeSingle()
    if (buscarError) {
      console.error('PayPhone webhook: error buscando la compra', buscarError)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }
    if (!compra) {
      console.error('PayPhone webhook: no se encontró compra para ClientTransactionId', ClientTransactionId)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }
    const yaProcesadaConEsteTransactionId =
      compra.estado === 'aprobado' &&
      compra.payphone_numeric_id !== null &&
      Number(compra.payphone_numeric_id) === Number(TransactionId)
    if (yaProcesadaConEsteTransactionId) {
      console.log('PayPhone webhook: TransactionId duplicado, ya procesado', TransactionId)
      return NextResponse.json({ Response: false, ErrorCode: '333' })
    }
    if (TransactionStatus !== 'Approved') {
      const { error: rechazoError } = await supabase
        .from('compras')
        .update({ estado: 'rechazado' })
        .eq('id', compra.id)
      if (rechazoError) {
        console.error('PayPhone webhook: error al marcar compra como rechazada', rechazoError)
        return NextResponse.json({ Response: false, ErrorCode: '222' })
      }
      console.log('PayPhone webhook: transacción no aprobada', { ClientTransactionId, TransactionStatus, StatusCode })
      return NextResponse.json({ Response: true, ErrorCode: '000' })
    }
    const montoFinal = Amount / 100
    const { error: updateError } = await supabase
      .from('compras')
      .update({
        estado: 'aprobado',
        monto: montoFinal,
        payphone_numeric_id: TransactionId,
        payphone_authorization_code: AuthorizationCode,
      })
      .eq('id', compra.id)
    if (updateError) {
      console.error('PayPhone webhook: error al aprobar la compra', updateError)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }
    console.log('PayPhone webhook: compra aprobada', { compraId: compra.id, TransactionId })

    // Enviar correo de confirmación de compra (no bloqueante)
    try {
      const [{ data: alumno }, { data: curso }] = await Promise.all([
        supabase.auth.admin.getUserById(compra.alumno_id),
        supabase.from('cursos').select('titulo').eq('id', compra.curso_id).single(),
      ])
      const emailAlumno = alumno?.user?.email
      if (emailAlumno) {
        const { subject, html } = plantillaCompra(curso?.titulo || 'tu curso', montoFinal)
        enviarEmail({ to: emailAlumno, subject, html }).catch((err) =>
          console.error('Error enviando email de compra:', err)
        )
      } else {
        console.error('PayPhone webhook: no se encontró email del alumno', compra.alumno_id)
      }
    } catch (emailErr) {
      console.error('PayPhone webhook: error preparando email de compra', emailErr)
    }

    return NextResponse.json({ Response: true, ErrorCode: '000' })
  } catch (error) {
    console.error('PayPhone webhook: error inesperado', error)
    return NextResponse.json({ Response: false, ErrorCode: '222' })
  }
}