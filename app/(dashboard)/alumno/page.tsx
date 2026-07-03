import LogoutButton from '@/components/auth/LogoutButton'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPerfil, getComprasAlumno, getProgreso, getLeccionesPorCurso } from '@/lib/db'

export default async function AlumnoDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Debes iniciar sesión.</p>
      </main>
    )
  }

  const [perfil, compras, progreso, { data: certificados }] = await Promise.all([
    getPerfil(user.id),
    getComprasAlumno(user.id), // ya viene filtrado por estado = 'aprobado'
    getProgreso(user.id),      // ya viene filtrado por completado = true
    supabase.from('certificados').select('id, curso_id').eq('alumno_id', user.id),
  ])

  const nombre = perfil?.nombre || user.email?.split('@')[0] || 'Alumno'
  const iniciales = nombre
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Progreso real por curso comprado
  const cursosConProgreso = await Promise.all(
    compras.map(async (compra: any) => {
      const lecciones = await getLeccionesPorCurso(compra.curso_id)
      const totalLecciones = lecciones.length
      const idsLeccionesDelCurso = new Set(lecciones.map((l: any) => l.id))
      const completadas = progreso.filter((p: any) =>
        idsLeccionesDelCurso.has(p.leccion_id)
      ).length

      return {
        cursoId: compra.curso_id,
        titulo: compra.cursos?.titulo || 'Curso',
        totalLecciones,
        completadas,
        porcentaje: totalLecciones > 0 ? Math.round((completadas / totalLecciones) * 100) : 0,
      }
    })
  )

  // Ordenar: primero los que tienen progreso pero no están completos
  const continuarEstudiando = [...cursosConProgreso]
    .filter((c) => c.totalLecciones > 0)
    .sort((a, b) => {
      if (a.porcentaje === 100 && b.porcentaje !== 100) return 1
      if (b.porcentaje === 100 && a.porcentaje !== 100) return -1
      return b.porcentaje - a.porcentaje
    })
    .slice(0, 3)

  const cursoConLeccionesPendientes = continuarEstudiando.find((c) => c.porcentaje < 100)

  const cursosCompletados = cursosConProgreso.filter(
    (c) => c.totalLecciones > 0 && c.porcentaje === 100
  ).length

  const totalCertificados = certificados?.length || 0

  // Logros calculados con datos reales (no simulados)
  const logros = [
    {
      icono: '🎯',
      nombre: 'Primer curso',
      desc: 'Inscribiste tu primer curso',
      obtenido: compras.length >= 1,
    },
    {
      icono: '⚡',
      nombre: '5 lecciones completadas',
      desc: 'Completa 5 lecciones en total',
      obtenido: progreso.length >= 5,
    },
    {
      icono: '🎓',
      nombre: 'Graduado',
      desc: 'Completa un curso entero',
      obtenido: cursosCompletados >= 1,
    },
    {
      icono: '📜',
      nombre: 'Primer certificado',
      desc: 'Obtén tu primer certificado',
      obtenido: totalCertificados >= 1,
    },
  ]

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* TOP BAR */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">Bienvenido, {nombre}</span>
          <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center text-yellow-500 font-bold text-sm">
            {iniciales}
          </div>
        </div>
      </div>

      <div className="flex">

        {/* SIDEBAR */}
        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Principal</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>🏠</span> Inicio
          </a>
          <Link href="/cursos" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🔍</span> Explorar
          </Link>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-4">Aprendizaje</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🏆</span> Logros
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🎓</span> Certificados
          </a>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        {/* CONTENIDO */}
        <div className="flex-1 p-8">

          {/* BIENVENIDA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Bienvenido de vuelta, {nombre} 👋</h2>
              <p className="text-slate-400 text-sm">
                {cursoConLeccionesPendientes
                  ? `Tienes ${cursoConLeccionesPendientes.totalLecciones - cursoConLeccionesPendientes.completadas} lecciones pendientes en ${cursoConLeccionesPendientes.titulo}.`
                  : compras.length === 0
                  ? 'Todavía no tienes cursos. ¡Explora el catálogo y empieza hoy!'
                  : '¡Vas muy bien! Sigue así.'}
              </p>
            </div>
            {cursoConLeccionesPendientes ? (
              <Link
                href={`/cursos/${cursoConLeccionesPendientes.cursoId}`}
                className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                ▶ Continuar
              </Link>
            ) : (
              <Link
                href="/cursos"
                className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Explorar cursos
              </Link>
            )}
          </div>

          {/* STATS (datos reales) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Lecciones completadas', value: String(progreso.length), sub: 'En total', color: 'text-green-400' },
              { label: 'Cursos activos', value: String(compras.length), sub: `${cursosCompletados} completado(s)`, color: 'text-sky-400' },
              { label: 'Certificados obtenidos', value: String(totalCertificados), sub: 'De cursos completados', color: 'text-purple-400' },
              { label: 'Logros', value: `${logros.filter(l => l.obtenido).length}/${logros.length}`, sub: 'Desbloqueados', color: 'text-yellow-500' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{s.label}</div>
                <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* CURSOS EN PROGRESO */}
          <h3 className="text-lg font-bold mb-4">
            {compras.length === 0 ? 'Aún no tienes cursos' : 'Continuar estudiando'}
          </h3>

          {compras.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center mb-8">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-400 mb-4">Explora el catálogo y compra tu primer curso para empezar.</p>
              <Link
                href="/cursos"
                className="inline-block bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Ver catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {continuarEstudiando.map((c) => (
                <Link
                  key={c.cursoId}
                  href={`/cursos/${c.cursoId}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-yellow-500/40 transition-colors block"
                >
                  <div className="text-sm font-semibold mb-3 leading-snug">{c.titulo}</div>
                  <div className="h-1.5 bg-slate-800 rounded-full mb-2">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${c.porcentaje}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-yellow-500 font-mono">
                    {c.porcentaje}% · Lección {c.completadas}/{c.totalLecciones}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* LOGROS */}
          <h3 className="text-lg font-bold mb-4">Logros</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {logros.map((l) => (
              <div key={l.nombre} className={`bg-slate-900 border border-slate-800 rounded-xl p-4 text-center ${!l.obtenido ? 'opacity-40' : ''}`}>
                <div className="text-3xl mb-2">{l.icono}</div>
                <div className="text-sm font-semibold mb-1">{l.nombre}</div>
                <div className="text-xs text-slate-500">{l.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </main>
  )
}