import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'

const ESTADO_ESTILO: Record<string, string> = {
  aprobado: 'bg-green-500/10 text-green-400 border border-green-500/30',
  pendiente: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
  rechazado: 'bg-red-500/10 text-red-400 border border-red-500/30',
  revocado: 'bg-slate-800 text-slate-400 border border-slate-700',
}

// Cuántas ventas se listan en la tabla (las más recientes). Los totales de
// arriba sí se calculan sobre todas las compras aprobadas.
const LIMITE_TABLA = 200

function claveMes(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}

export default async function VentasAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const perfil = await getPerfil(user.id)

  if (perfil?.rol !== 'admin') {
    redirect(perfil?.rol === 'docente' ? '/docente' : '/alumno')
  }

  const nombre = perfil?.nombre || user.email?.split('@')[0] || 'Administrador'

  // El rol admin ya se verificó arriba. Se lee con el cliente admin porque
  // la política RLS de "compras" solo deja ver a cada alumno las suyas.
  const admin = createAdminSupabaseClient()

  const [{ data: aprobadas }, { data: recientes }] = await Promise.all([
    admin.from('compras').select('monto, curso_id, alumno_id, created_at').eq('estado', 'aprobado'),
    admin
      .from('compras')
      .select('id, alumno_id, curso_id, monto, estado, created_at, payphone_transaction_id, paquete_id')
      .order('created_at', { ascending: false })
      .limit(LIMITE_TABLA),
  ])

  const idsCursos = [...new Set((recientes || []).map((c) => c.curso_id).concat((aprobadas || []).map((c) => c.curso_id)))]
  const idsAlumnos = [...new Set((recientes || []).map((c) => c.alumno_id))]

  const [{ data: cursos }, { data: alumnos }] = await Promise.all([
    idsCursos.length > 0
      ? admin.from('cursos').select('id, titulo').in('id', idsCursos)
      : Promise.resolve({ data: [] as { id: string; titulo: string }[] }),
    idsAlumnos.length > 0
      ? admin.from('perfiles').select('id, nombre, email').in('id', idsAlumnos)
      : Promise.resolve({ data: [] as { id: string; nombre: string; email: string }[] }),
  ])

  const tituloPorCurso = new Map((cursos || []).map((c) => [c.id as string, c.titulo as string]))
  const alumnoPorId = new Map((alumnos || []).map((a) => [a.id as string, a]))

  const ahora = new Date()
  const mesActual = claveMes(ahora)
  const mesAnterior = claveMes(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1))

  let ingresosTotales = 0
  let ingresosMes = 0
  let ingresosMesAnterior = 0
  const compradores = new Set<string>()
  const porMes = new Map<string, { ventas: number; ingresos: number }>()
  const porCurso = new Map<string, { ventas: number; ingresos: number }>()

  for (const c of aprobadas || []) {
    const monto = Number(c.monto) || 0
    const mes = claveMes(new Date(c.created_at))

    ingresosTotales += monto
    if (mes === mesActual) ingresosMes += monto
    if (mes === mesAnterior) ingresosMesAnterior += monto
    compradores.add(c.alumno_id)

    const m = porMes.get(mes) || { ventas: 0, ingresos: 0 }
    m.ventas += 1
    m.ingresos += monto
    porMes.set(mes, m)

    const k = porCurso.get(c.curso_id) || { ventas: 0, ingresos: 0 }
    k.ventas += 1
    k.ingresos += monto
    porCurso.set(c.curso_id, k)
  }

  const totalVentas = (aprobadas || []).length
  const ticketPromedio = totalVentas > 0 ? ingresosTotales / totalVentas : 0

  const meses = Array.from(porMes.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  const maxMes = Math.max(1, ...meses.map(([, v]) => v.ingresos))

  const topCursos = Array.from(porCurso.entries())
    .map(([cursoId, v]) => ({ cursoId, titulo: tituloPorCurso.get(cursoId) || 'Curso eliminado', ...v }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 10)

  const formatoFecha = (iso: string) =>
    new Date(iso).toLocaleString('es-EC', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Guayaquil',
    })

  const nombreMes = (clave: string) => {
    const [anio, mes] = clave.split('-').map(Number)
    return new Date(anio, mes - 1, 1).toLocaleDateString('es-EC', { year: 'numeric', month: 'long' })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">{nombre}</span>
          <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-sm">
            AD
          </div>
        </div>
      </div>

      <div className="flex">

        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1 flex-shrink-0">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Plataforma</div>
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors">
            <span>📊</span> Dashboard Global
          </Link>
          <Link href="/admin/ventas" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>💵</span> Ventas
          </Link>
          <Link href="/admin/usuarios" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors">
            <span>👥</span> Usuarios
          </Link>
          <Link href="/admin/categorias" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors">
            <span>🏷️</span> Categorías
          </Link>
          <Link href="/admin/ofertas" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors">
            <span>🎁</span> Ofertas
          </Link>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 p-8 min-w-0">

          <h1 className="text-2xl font-bold mb-1">Ventas</h1>
          <p className="text-slate-400 text-sm mb-8">Ingresos por compras aprobadas. Cada curso de un paquete cuenta como una venta.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Ingresos del mes', value: `$${ingresosMes.toFixed(2)}`, sub: `$${ingresosMesAnterior.toFixed(2)} el mes anterior`, color: 'text-green-400' },
              { label: 'Ingresos históricos', value: `$${ingresosTotales.toFixed(2)}`, sub: `${totalVentas} venta${totalVentas !== 1 ? 's' : ''} aprobada${totalVentas !== 1 ? 's' : ''}`, color: 'text-yellow-500' },
              { label: 'Alumnos que compraron', value: String(compradores.size), sub: 'Con al menos una compra', color: 'text-sky-400' },
              { label: 'Valor promedio', value: `$${ticketPromedio.toFixed(2)}`, sub: 'Por curso vendido', color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{s.label}</div>
                <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-base font-bold">Ingresos por mes</h3>
              </div>
              {meses.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Todavía no hay ventas aprobadas.</div>
              ) : (
                <div className="p-6 space-y-4">
                  {meses.map(([clave, v]) => (
                    <div key={clave}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{nombreMes(clave)}</span>
                        <span className="font-mono">
                          <span className="text-slate-500 mr-3">{v.ventas} venta{v.ventas !== 1 ? 's' : ''}</span>
                          <span className="font-bold">${v.ingresos.toFixed(2)}</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.max(2, (v.ingresos / maxMes) * 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-base font-bold">Cursos más vendidos</h3>
              </div>
              {topCursos.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Todavía no hay ventas aprobadas.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Curso</th>
                      <th className="text-right px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Ventas</th>
                      <th className="text-right px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCursos.map((c) => (
                      <tr key={c.cursoId} className="border-b border-slate-800 last:border-0">
                        <td className="px-6 py-3 font-semibold">{c.titulo}</td>
                        <td className="px-6 py-3 text-right text-slate-400 font-mono">{c.ventas}</td>
                        <td className="px-6 py-3 text-right text-yellow-500 font-bold font-mono">${c.ingresos.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold">Últimos movimientos</h3>
              <p className="text-slate-500 text-xs mt-1">Las {LIMITE_TABLA} compras más recientes, en cualquier estado.</p>
            </div>
            {(recientes || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Todavía no hay compras registradas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Fecha</th>
                      <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Alumno</th>
                      <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Curso</th>
                      <th className="text-right px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Monto</th>
                      <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Estado</th>
                      <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Transacción</th>
                      <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recientes || []).map((c) => {
                      const alumno = alumnoPorId.get(c.alumno_id)
                      return (
                        <tr key={c.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-3 text-slate-400 whitespace-nowrap">{formatoFecha(c.created_at)}</td>
                          <td className="px-6 py-3">
                            <Link href={`/admin/usuarios/${c.alumno_id}`} className="font-semibold hover:text-yellow-500 transition-colors">
                              {alumno?.nombre || 'Sin nombre'}
                            </Link>
                            {alumno?.email && <div className="text-xs text-slate-500">{alumno.email}</div>}
                          </td>
                          <td className="px-6 py-3">
                            {tituloPorCurso.get(c.curso_id) || 'Curso eliminado'}
                            {c.paquete_id && <span className="ml-2 text-xs text-yellow-500">🎁 Paquete</span>}
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-bold">${(Number(c.monto) || 0).toFixed(2)}</td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${ESTADO_ESTILO[c.estado] || ESTADO_ESTILO.revocado}`}>
                              {c.estado}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-500 font-mono text-xs">{c.payphone_transaction_id || '—'}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            {c.estado === 'aprobado' && (
                              <Link href={`/alumno/comprobante/${c.id}`} className="text-yellow-500 text-xs font-semibold hover:text-yellow-400 transition-colors">
                                Comprobante
                              </Link>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}
