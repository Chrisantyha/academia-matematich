import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'
import BotonImprimir from '@/components/ui/BotonImprimir'

export const metadata: Metadata = {
  title: 'Comprobante de pago',
  robots: { index: false, follow: false },
}

// Comprobante de pago imprimible de una compra aprobada. Lo puede abrir el
// alumno dueño de la compra o un admin. Si la compra fue parte de un paquete,
// muestra todos los cursos de ese paquete con el total pagado.
//
// Es una constancia interna del pago recibido, no una factura: no lleva
// numeración ni datos tributarios.
export default async function ComprobantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const perfil = await getPerfil(user.id)
  const esAdmin = perfil?.rol === 'admin'

  const admin = createAdminSupabaseClient()

  const { data: compra } = await admin
    .from('compras')
    .select('id, alumno_id, curso_id, monto, estado, created_at, payphone_transaction_id, paquete_id')
    .eq('id', id)
    .maybeSingle()

  const noEncontrada = !compra || compra.estado !== 'aprobado' || (!esAdmin && compra.alumno_id !== user.id)

  if (noEncontrada) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🧾</div>
          <h1 className="text-2xl font-bold mb-2">Comprobante no encontrado</h1>
          <p className="text-slate-400 mb-6">No existe un pago aprobado con este identificador en tu cuenta.</p>
          <Link href="/alumno/mis-cursos" className="text-yellow-500 font-semibold hover:text-yellow-400">
            Volver a mis cursos
          </Link>
        </div>
      </main>
    )
  }

  // Todas las filas del mismo pago: una si fue compra individual, varias si
  // fue un paquete.
  let filas: { id: string; curso_id: string; monto: number }[] = [
    { id: compra.id, curso_id: compra.curso_id, monto: Number(compra.monto) },
  ]

  if (compra.paquete_id) {
    const { data: delPaquete } = await admin
      .from('compras')
      .select('id, curso_id, monto')
      .eq('paquete_id', compra.paquete_id)
      .eq('alumno_id', compra.alumno_id)
      .eq('estado', 'aprobado')

    if (delPaquete && delPaquete.length > 0) {
      filas = delPaquete.map((f) => ({ id: f.id, curso_id: f.curso_id, monto: Number(f.monto) }))
    }
  }

  const { data: cursos } = await admin
    .from('cursos')
    .select('id, titulo')
    .in('id', filas.map((f) => f.curso_id))

  const tituloPorCurso = new Map((cursos || []).map((c) => [c.id as string, c.titulo as string]))

  const { data: alumnoPerfil } = await admin
    .from('perfiles')
    .select('nombre')
    .eq('id', compra.alumno_id)
    .maybeSingle()

  const { data: alumnoAuth } = await admin.auth.admin.getUserById(compra.alumno_id)

  const total = filas.reduce((acc, f) => acc + (Number.isFinite(f.monto) ? f.monto : 0), 0)

  const fecha = new Date(compra.created_at).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Guayaquil',
  })

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 print:bg-white print:text-black print:p-0">
      <div className="w-full max-w-2xl">

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 print:bg-white print:border-slate-300 print:rounded-none">

          <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="text-2xl font-bold">
                Exacta<span className="text-yellow-500">Lab</span>
              </div>
              <div className="text-slate-400 text-xs mt-1 print:text-slate-600">matematich.club</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-yellow-500">Comprobante de pago</div>
              <div className="text-slate-400 text-xs mt-1 font-mono print:text-slate-600">{compra.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-sm">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Pagado por</div>
              <div className="font-semibold">{alumnoPerfil?.nombre || 'Estudiante'}</div>
              {alumnoAuth?.user?.email && (
                <div className="text-slate-400 break-all print:text-slate-600">{alumnoAuth.user.email}</div>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Fecha</div>
              <div className="font-semibold">{fecha}</div>
              {compra.payphone_transaction_id && (
                <>
                  <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-3 mb-1">Transacción PayPhone</div>
                  <div className="font-mono text-xs">{compra.payphone_transaction_id}</div>
                </>
              )}
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-slate-700 print:border-slate-300">
                <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase tracking-widest">Curso</th>
                <th className="text-right py-2 text-xs text-slate-500 font-bold uppercase tracking-widest">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-b border-slate-800 print:border-slate-200">
                  <td className="py-3 pr-4">{tituloPorCurso.get(f.curso_id) || 'Curso'}</td>
                  <td className="py-3 text-right font-mono">${f.monto.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 font-bold">Total pagado (USD)</td>
                <td className="pt-4 text-right font-bold font-mono text-yellow-500 text-lg print:text-black">${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="text-slate-500 text-xs leading-relaxed">
            {compra.paquete_id ? 'Compra en paquete con descuento. ' : ''}
            Acceso de por vida al contenido adquirido. Este documento es una constancia del pago recibido y no reemplaza a una factura.
          </p>
        </div>

        <div className="flex gap-4 justify-center mt-8 flex-wrap print:hidden">
          <BotonImprimir texto="🖨️ Imprimir o guardar PDF" />
          <Link
            href={esAdmin && compra.alumno_id !== user.id ? '/admin/ventas' : '/alumno/mis-cursos'}
            className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Volver
          </Link>
        </div>

      </div>
    </main>
  )
}
