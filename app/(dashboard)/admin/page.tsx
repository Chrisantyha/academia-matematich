import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPerfil } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Debes iniciar sesión.</p>
      </main>
    )
  }

  const perfil = await getPerfil(user.id)
  const nombre = perfil?.nombre || user.email?.split('@')[0] || 'Administrador'

  const [
    { data: cursos },
    { count: totalAlumnos },
    { data: comprasAprobadas },
  ] = await Promise.all([
    supabase
      .from('cursos')
      .select(`
        id, titulo, publicado, precio,
        docente_id,
        perfiles ( nombre, email ),
        modulos ( lecciones ( id ) )
      `)
      .order('created_at', { ascending: false }),
    supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('rol', 'alumno'),
    supabase.from('compras').select('monto, curso_id, created_at').eq('estado', 'aprobado'),
  ])

  const comprasPorCurso = new Map<string, { alumnos: number; ingresos: number }>()
  for (const compra of comprasAprobadas || []) {
    const actual = comprasPorCurso.get(compra.curso_id) || { alumnos: 0, ingresos: 0 }
    actual.alumnos += 1
    actual.ingresos += compra.monto || 0
    comprasPorCurso.set(compra.curso_id, actual)
  }

  const cursosConDatos = (cursos || []).map((curso: any) => {
    const totalLecciones = (curso.modulos || []).reduce(
      (acc: number, m: any) => acc + (m.lecciones?.length || 0),
      0
    )
    const datosCompras = comprasPorCurso.get(curso.id) || { alumnos: 0, ingresos: 0 }

    return {
      id: curso.id,
      titulo: curso.titulo,
      docenteNombre: curso.perfiles?.nombre || 'Sin asignar',
      publicado: curso.publicado,
      lecciones: totalLecciones,
      alumnos: datosCompras.alumnos,
      ingresos: datosCompras.ingresos,
    }
  })

  const docentesMap = new Map<string, { nombre: string; email: string; cursos: number; alumnos: number }>()
  for (const curso of cursosConDatos) {
    const key = curso.docenteNombre
    const actual = docentesMap.get(key) || { nombre: key, email: '', cursos: 0, alumnos: 0 }
    actual.cursos += 1
    actual.alumnos += curso.alumnos
    docentesMap.set(key, actual)
  }
  const docentes = Array.from(docentesMap.values())

  const cursosPublicados = cursosConDatos.filter((c) => c.publicado).length
  const cursosEnRevision = cursosConDatos.filter((c) => !c.publicado).length
  const ingresosTotales = (comprasAprobadas || []).reduce((acc, c) => acc + (c.monto || 0), 0)

  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const ingresosDelMes = (comprasAprobadas || [])
    .filter((c) => new Date(c.created_at) >= inicioMes)
    .reduce((acc, c) => acc + (c.monto || 0), 0)

  async function aprobarCurso(formData: FormData) {
    'use server'
    const cursoId = formData.get('cursoId') as string
    const supabase = await createServerSupabaseClient()
    await supabase.from('cursos').update({ publicado: true }).eq('id', cursoId)
    revalidatePath('/admin')
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

        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Plataforma</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>📊</span> Dashboard Global
          </a>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 p-8">

          {cursosEnRevision > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-3 rounded-xl mb-6">
              ⏳ {cursosEnRevision} curso(s) pendiente(s) de revisión y aprobación.
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Alumnos registrados', value: String(totalAlumnos || 0), sub: 'Total en la plataforma', color: 'text-yellow-500' },
              { label: 'Ingresos del mes', value: `$${ingresosDelMes.toFixed(2)}`, sub: `$${ingresosTotales.toFixed(2)} histórico`, color: 'text-green-400' },
              { label: 'Cursos publicados', value: String(cursosPublicados), sub: `${cursosEnRevision} en revisión`, color: 'text-sky-400' },
              { label: 'Docentes con cursos', value: String(docentes.length), sub: 'Con al menos 1 curso', color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{s.label}</div>
                <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold">Docentes con cursos</h3>
            </div>
            {docentes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Todavía no hay docentes con cursos creados.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Docente</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Cursos</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Alumnos</th>
                  </tr>
                </thead>
                <tbody>
                  {docentes.map((d) => (
                    <tr key={d.nombre} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold">{d.nombre}</td>
                      <td className="px-6 py-4 text-slate-400">{d.cursos}</td>
                      <td className="px-6 py-4 text-slate-400">{d.alumnos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold">Gestión de cursos</h3>
            </div>
            {cursosConDatos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Todavía no hay cursos creados.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Curso</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Docente</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Lecciones</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Alumnos</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Estado</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Ingresos</th>
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cursosConDatos.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold">{c.titulo}</td>
                      <td className="px-6 py-4 text-slate-400">{c.docenteNombre}</td>
                      <td className="px-6 py-4 text-slate-400">{c.lecciones}</td>
                      <td className="px-6 py-4 text-slate-400">{c.alumnos}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          c.publicado
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {c.publicado ? 'Publicado' : 'En revisión'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-yellow-500 font-bold">${c.ingresos.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {c.publicado ? (
                          <Link
                            href={`/cursos/${c.id}`}
                            className="text-yellow-500 text-xs font-semibold hover:text-yellow-400 transition-colors"
                          >
                            Ver
                          </Link>
                        ) : (
                          <form action={aprobarCurso}>
                            <input type="hidden" name="cursoId" value={c.id} />
                            <button
                              type="submit"
                              className="text-green-400 text-xs font-semibold hover:text-green-300 transition-colors"
                            >
                              Aprobar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}