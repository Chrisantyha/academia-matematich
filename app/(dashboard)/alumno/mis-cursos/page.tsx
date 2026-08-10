import LogoutButton from '@/components/auth/LogoutButton'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPerfil, getProgreso, getLeccionesPorCurso } from '@/lib/db'

export default async function MisCursosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Debes iniciar sesión.</p>
      </main>
    )
  }

  const [perfil, progreso] = await Promise.all([
    getPerfil(user.id),
    getProgreso(user.id), // ya viene filtrado por completado = true
  ])

  const { data: compras } = await supabase
    .from('compras')
    .select('id, curso_id, monto, created_at, paquete_id, cursos (id, titulo, categoria, nivel, imagen_url)')
    .eq('alumno_id', user.id)
    .eq('estado', 'aprobado')
    .order('created_at', { ascending: false })

  const nombre = perfil?.nombre || user.email?.split('@')[0] || 'Alumno'
  const iniciales = nombre
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const cursosConProgreso = await Promise.all(
    (compras || []).map(async (compra: any) => {
      const lecciones = await getLeccionesPorCurso(compra.curso_id)
      const totalLecciones = lecciones.length
      const idsLeccionesDelCurso = new Set(lecciones.map((l: any) => l.id))
      const completadas = progreso.filter((p: any) =>
        idsLeccionesDelCurso.has(p.leccion_id)
      ).length

      return {
        compraId: compra.id,
        cursoId: compra.curso_id,
        titulo: compra.cursos?.titulo || 'Curso',
        categoria: compra.cursos?.categoria,
        nivel: compra.cursos?.nivel,
        imagenUrl: compra.cursos?.imagen_url,
        paqueteId: compra.paquete_id,
        totalLecciones,
        completadas,
        porcentaje: totalLecciones > 0 ? Math.round((completadas / totalLecciones) * 100) : 0,
      }
    })
  )

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
          <Link href="/alumno" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🏠</span> Inicio
          </Link>
          <Link href="/alumno/mis-cursos" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>📖</span> Mis cursos
          </Link>
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

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Mis cursos</h1>
            <p className="text-slate-400 text-sm">
              {cursosConProgreso.length === 0
                ? 'Todavía no has comprado ningún curso.'
                : `Tienes acceso a ${cursosConProgreso.length} curso${cursosConProgreso.length !== 1 ? 's' : ''}.`}
            </p>
          </div>

          {cursosConProgreso.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursosConProgreso.map((c) => (
                <Link
                  key={c.compraId}
                  href={`/cursos/${c.cursoId}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-yellow-500/40 transition-colors group"
                >
                  <div className="h-32 bg-slate-800 flex items-center justify-center text-5xl relative overflow-hidden">
                    {c.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imagenUrl} alt={c.titulo} className="w-full h-full object-cover" />
                    ) : (
                      '📚'
                    )}
                    {c.paqueteId && (
                      <span className="absolute top-3 right-3 bg-yellow-500/90 text-black text-xs font-bold px-2 py-1 rounded-full">
                        🎁 Paquete
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    {c.categoria && (
                      <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                        {c.categoria}
                      </div>
                    )}
                    <h3 className="text-base font-bold mb-3 leading-snug">
                      {c.titulo}
                    </h3>
                    <div className="h-1.5 bg-slate-800 rounded-full mb-2">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${c.porcentaje}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {c.porcentaje}% · {c.completadas}/{c.totalLecciones} lecciones
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}