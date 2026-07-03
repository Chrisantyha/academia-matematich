import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPerfil } from '@/lib/db'

export default async function DocenteDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Debes iniciar sesión.</p>
      </main>
    )
  }

  const [perfil, { data: cursos }] = await Promise.all([
    getPerfil(user.id),
    supabase
      .from('cursos')
      .select(`
        id, titulo, precio, publicado, categoria,
        modulos ( lecciones ( id ) )
      `)
      .eq('docente_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const nombre = perfil?.nombre || user.email?.split('@')[0] || 'Docente'
  const iniciales = nombre
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const cursosConDatos = await Promise.all(
    (cursos || []).map(async (curso: any) => {
      const totalLecciones = (curso.modulos || []).reduce(
        (acc: number, m: any) => acc + (m.lecciones?.length || 0),
        0
      )

      const { data: compras } = await supabase
        .from('compras')
        .select('monto')
        .eq('curso_id', curso.id)
        .eq('estado', 'aprobado')

      const alumnos = compras?.length || 0
      const ingresos = (compras || []).reduce((acc: number, c: any) => acc + (c.monto || 0), 0)

      return {
        id: curso.id,
        titulo: curso.titulo,
        categoria: curso.categoria,
        publicado: curso.publicado,
        lecciones: totalLecciones,
        alumnos,
        ingresos,
      }
    })
  )

  const totalEstudiantes = cursosConDatos.reduce((acc, c) => acc + c.alumnos, 0)
  const totalIngresos = cursosConDatos.reduce((acc, c) => acc + c.ingresos, 0)
  const cursosPublicados = cursosConDatos.filter((c) => c.publicado).length
  const cursosEnRevision = cursosConDatos.filter((c) => !c.publicado).length
  const totalLeccionesGeneral = cursosConDatos.reduce((acc, c) => acc + c.lecciones, 0)

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">{nombre}</span>
          <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-sm">
            {iniciales}
          </div>
        </div>
      </div>

      <div className="flex">

        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Mi contenido</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>📊</span> Mi Panel
          </a>
          <Link
            href="/docente/crear-curso"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors"
          >
            <span>➕</span> Crear curso
          </Link>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 p-8">

          {cursosEnRevision > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-3 rounded-xl mb-6">
              📝 Tienes {cursosEnRevision} curso(s) en borrador, sin publicar todavía.
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Estudiantes totales', value: String(totalEstudiantes), sub: 'En todos tus cursos', color: 'text-yellow-500' },
              { label: 'Cursos publicados', value: String(cursosPublicados), sub: `${cursosEnRevision} en borrador`, color: 'text-sky-400' },
              { label: 'Lecciones totales', value: String(totalLeccionesGeneral), sub: 'Contenido subido', color: 'text-green-400' },
              { label: 'Ingresos totales', value: `$${totalIngresos.toFixed(2)}`, sub: 'De compras aprobadas', color: 'text-purple-400' },
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
              <h3 className="text-base font-bold">Mis cursos</h3>
              <Link
                href="/docente/crear-curso"
                className="bg-yellow-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors"
              >
                + Nuevo curso
              </Link>
            </div>

            {cursosConDatos.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl mb-3">🎬</div>
                <p className="text-slate-400 text-sm mb-4">Todavía no has creado ningún curso.</p>
                <Link
                  href="/docente/crear-curso"
                  className="inline-block bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
                >
                  Crear mi primer curso
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Curso</th>
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
                      <td className="px-6 py-4">
                        <span className="font-semibold">{c.titulo}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{c.lecciones}</td>
                      <td className="px-6 py-4 text-slate-400">{c.alumnos}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          c.publicado
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {c.publicado ? 'Publicado' : 'Borrador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-yellow-500 font-bold">${c.ingresos.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/docente/curso/${c.id}`}
                          className="text-yellow-500 text-xs font-semibold hover:text-yellow-400 transition-colors"
                        >
                          Gestionar →
                        </Link>
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