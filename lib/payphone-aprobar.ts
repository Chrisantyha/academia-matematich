import { randomBytes } from 'crypto'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { consultarPayphone } from '@/lib/payphone'
import { enviarEmail } from '@/lib/email/enviar'
import { plantillaCompra } from '@/lib/email/plantillas/compra'

// Identificador único de transacción para PayPhone. Antes era "AM" + los
// segundos del reloj, así que dos compras en el mismo segundo chocaban. Ahora
// combina los milisegundos (en base 36) con 4 caracteres aleatorios: 14
// caracteres en total, el mismo orden de tamaño que el formato anterior.
export function nuevoClientTransactionId(prefijo: 'AM' | 'AP'): string {
  const tiempo = Date.now().toString(36).toUpperCase().padStart(8, '0').slice(-8)
  const azar = randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `${prefijo}${tiempo}${azar}`
}

type ResultadoAprobacion =
  | { ok: true; cursoIds: string[]; yaEstabaAprobada: boolean }
  | { ok: false; error: string; estado?: string; status: number }

// Aprueba la(s) compra(s) de una transacción SOLO después de preguntarle a
// PayPhone, servidor a servidor, que el pago fue aprobado y que el monto
// cobrado cubre lo que se esperaba. La usan /api/payphone/verificar (el
// sondeo automático del botón de compra) y /api/payphone/confirmar (la página
// de retorno). Escribe con el cliente admin: la aprobación de una compra
// nunca debe depender de que el propio alumno tenga permiso de actualizarla.
export async function aprobarCompraVerificada(
  clientTransactionId: string,
  alumnoId: string,
  emailAlumno?: string | null
): Promise<ResultadoAprobacion> {
  const admin = createAdminSupabaseClient()

  const { data: compras, error: buscarError } = await admin
    .from('compras')
    .select('id, alumno_id, curso_id, monto, estado')
    .eq('payphone_transaction_id', clientTransactionId)
    .eq('alumno_id', alumnoId)

  if (buscarError) {
    console.error('aprobarCompraVerificada: error buscando compras', buscarError)
    return { ok: false, error: 'Error al buscar la compra', status: 500 }
  }

  if (!compras || compras.length === 0) {
    return { ok: false, error: 'No se encontró la compra', status: 404 }
  }

  const cursoIds = compras.map((c) => c.curso_id as string)

  if (compras.every((c) => c.estado === 'aprobado')) {
    return { ok: true, cursoIds, yaEstabaAprobada: true }
  }

  let resultado: any
  try {
    resultado = await consultarPayphone(clientTransactionId)
  } catch (err) {
    console.error('aprobarCompraVerificada: error consultando a PayPhone', err)
    return { ok: false, error: 'No se pudo consultar el pago. Intenta de nuevo.', status: 502 }
  }

  const estado = resultado?.transactionStatus || resultado?.status

  if (estado !== 'Approved') {
    return { ok: false, error: 'El pago aun no ha sido aprobado', estado: estado || 'Desconocido', status: 200 }
  }

  // PayPhone reporta el monto en centavos. Se tolera 1 centavo de diferencia
  // por el redondeo del descuento de paquete (cada fila guarda su parte sin
  // redondear y el total cobrado sí se redondea).
  const esperadoCentavos = Math.round(
    compras.reduce((acc, c) => acc + Number(c.monto), 0) * 100
  )
  const pagadoCentavos = Number(resultado?.amount)

  if (!Number.isFinite(pagadoCentavos) || pagadoCentavos + 1 < esperadoCentavos) {
    console.error('aprobarCompraVerificada: monto pagado no cubre el esperado', {
      clientTransactionId,
      alumnoId,
      esperadoCentavos,
      pagadoCentavos: resultado?.amount,
    })
    return {
      ok: false,
      error: 'El monto del pago no coincide con el precio. Contacta soporte.',
      status: 400,
    }
  }

  const cambios: Record<string, unknown> = { estado: 'aprobado' }
  if (resultado?.transactionId !== undefined && resultado?.transactionId !== null) {
    cambios.payphone_numeric_id = resultado.transactionId
  }
  if (resultado?.authorizationCode !== undefined && resultado?.authorizationCode !== null) {
    cambios.payphone_authorization_code = resultado.authorizationCode
  }

  const ids = compras.map((c) => c.id)
  let { error: updateError } = await admin.from('compras').update(cambios).in('id', ids)

  // Si falló por las columnas extra (payphone_numeric_id / authorization
  // code), se reintenta solo con el estado: lo esencial es dar el acceso.
  if (updateError && Object.keys(cambios).length > 1) {
    console.error('aprobarCompraVerificada: reintentando solo con estado', updateError)
    const reintento = await admin.from('compras').update({ estado: 'aprobado' }).in('id', ids)
    updateError = reintento.error
  }

  if (updateError) {
    console.error('aprobarCompraVerificada: error al aprobar', updateError)
    return { ok: false, error: 'Error al activar el curso', status: 500 }
  }

  // Correo de confirmación (no bloqueante). Solo se envía aquí la primera vez
  // que se aprueba; si el webhook llega después, ve la compra ya procesada.
  if (emailAlumno) {
    try {
      let nombre = `Paquete de ${compras.length} cursos`
      if (compras.length === 1) {
        const { data: curso } = await admin
          .from('cursos')
          .select('titulo')
          .eq('id', compras[0].curso_id)
          .single()
        nombre = curso?.titulo || 'tu curso'
      }
      const { subject, html } = plantillaCompra(nombre, pagadoCentavos / 100)
      enviarEmail({ to: emailAlumno, subject, html }).catch((err) =>
        console.error('Error enviando email de compra:', err)
      )
    } catch (emailErr) {
      console.error('aprobarCompraVerificada: error preparando email', emailErr)
    }
  }

  return { ok: true, cursoIds, yaEstabaAprobada: false }
}
