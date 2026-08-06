import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { consultarPayphone } from '@/lib/payphone'
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
    // El body de este POST puede ser falsificado por cualquiera (no hay firma
    // ni secreto de webhook), asi que de aca solo se usan ClientTransactionId
    // (para saber que compra buscar) y StoreId (chequeo minimo existente). El
    // resto de campos -- TransactionStatus, Amount, AuthorizationCode,
    // TransactionId -- se ignoran y se vuelven a pedir server-to-server con
    // consultarPayphone antes de aprobar nada.
    const { ClientTransactionId, StoreId } = body ?? {}

    if (!ClientTransactionId || !StoreId) {
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

    // Verificacion server-to-server: es la unica fuente de verdad. Un
    // atacante puede simular este POST con TransactionStatus: "Approved",
    // pero no puede falsificar la respuesta que PayPhone le da a nuestro
    // backend usando PAYPHONE_TOKEN.
    let resultado: any
    try {
      resultado = await consultarPayphone(ClientTransactionId)
    } catch (err) {
      console.error('PayPhone webhook: error consultando a PayPhone', err)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }
    console.log('PayPhone webhook: verificacion server-to-server', resultado)

    const estadoVerificado = resultado?.transactionStatus || resultado?.status

    if (estadoVerificado !== 'Approved') {
      const { error: rechazoError } = await supabase
        .from('compras')
        .update({ estado: 'rechazado' })
        .eq('id', compra.id)
      if (rechazoError) {
        console.error('PayPhone webhook: error al marcar compra como rechazada', rechazoError)
        return NextResponse.json({ Response: false, ErrorCode: '222' })
      }
      console.log('PayPhone webhook: transacción no aprobada según verificación', { ClientTransactionId, estadoVerificado })
      return NextResponse.json({ Response: true, ErrorCode: '000' })
    }

    // El formato exacto de la respuesta de /Confirm no esta confirmado
    // (camelCase vs PascalCase), asi que se revisan ambas variantes. Estos
    // tres campos son los que se van a guardar como verdad -- si ninguna
    // variante viene definida no se asume ningun valor por defecto y se
    // rechaza la aprobación.
    const amountVerificado = resultado?.amount ?? resultado?.Amount
    const authorizationCodeVerificado = resultado?.authorizationCode ?? resultado?.AuthorizationCode
    const transactionIdVerificado = resultado?.transactionId ?? resultado?.TransactionId

    if (
      amountVerificado === undefined || amountVerificado === null ||
      authorizationCodeVerificado === undefined || authorizationCodeVerificado === null ||
      transactionIdVerificado === undefined || transactionIdVerificado === null
    ) {
      console.error('PayPhone webhook: respuesta de verificación incompleta, no se aprueba', resultado)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }

    const montoCentavosVerificado = Number(amountVerificado)
    if (!Number.isFinite(montoCentavosVerificado)) {
      console.error('PayPhone webhook: amount verificado no es numérico', amountVerificado)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }

    const yaProcesadaConEsteTransactionId =
      compra.estado === 'aprobado' &&
      compra.payphone_numeric_id !== null &&
      Number(compra.payphone_numeric_id) === Number(transactionIdVerificado)
    if (yaProcesadaConEsteTransactionId) {
      console.log('PayPhone webhook: TransactionId duplicado, ya procesado', transactionIdVerificado)
      return NextResponse.json({ Response: false, ErrorCode: '333' })
    }

    const { data: curso, error: cursoError } = await supabase
      .from('cursos')
      .select('titulo, precio')
      .eq('id', compra.curso_id)
      .single()

    if (cursoError || !curso) {
      console.error('PayPhone webhook: no se pudo leer el curso de la compra', cursoError)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }

    // Blindaje contra manipulación de precio: el monto verificado (en
    // centavos, mismo formato usado al crear el link de pago en
    // app/api/payphone/route.ts) debe cubrir el precio real del curso.
    const precioMinimoCentavos = Math.round(Number(curso.precio) * 100)
    if (montoCentavosVerificado < precioMinimoCentavos) {
      console.error('PayPhone webhook: monto verificado menor al precio del curso, posible manipulación', {
        compraId: compra.id,
        montoCentavosVerificado,
        precioMinimoCentavos,
      })
      const { error: rechazoError } = await supabase
        .from('compras')
        .update({ estado: 'rechazado' })
        .eq('id', compra.id)
      if (rechazoError) {
        console.error('PayPhone webhook: error al marcar compra como rechazada por monto insuficiente', rechazoError)
      }
      return NextResponse.json({ Response: true, ErrorCode: '000' })
    }

    const montoFinal = montoCentavosVerificado / 100

    const { error: updateError } = await supabase
      .from('compras')
      .update({
        estado: 'aprobado',
        monto: montoFinal,
        payphone_numeric_id: transactionIdVerificado,
        payphone_authorization_code: authorizationCodeVerificado,
      })
      .eq('id', compra.id)

    if (updateError) {
      console.error('PayPhone webhook: error al aprobar la compra', updateError)
      return NextResponse.json({ Response: false, ErrorCode: '222' })
    }
    console.log('PayPhone webhook: compra aprobada', { compraId: compra.id, transactionIdVerificado })

    // Enviar correo de confirmación de compra (no bloqueante)
    try {
      const { data: alumno } = await supabase.auth.admin.getUserById(compra.alumno_id)
      const emailAlumno = alumno?.user?.email
      if (emailAlumno) {
        const { subject, html } = plantillaCompra(curso.titulo || 'tu curso', montoFinal)
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
