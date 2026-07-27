import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import VideoPlayer from '@/components/curso/VideoPlayer'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPerfil } from '@/lib/db'
import { aprobarCurso } from '@/lib/actions/cursos'

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  publicado: 'Publicado',
}

export default async function RevisarCursoAdmin({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  const { data: curso }: { data: any } = await supabase
    .from('cursos')
    .select(`
      id, titulo, descripcion, precio, categoria, nivel, estado,
      perfiles ( nombre, email ),
      modulos ( id, titulo, orden, lecciones ( id, titulo, orden, video_url, es_gratis ) )
    `)
    .eq('id', id)
    .single()

  if (!curso) {
    redirect('/admin')
  }

  const modulos = (curso.modulos || []).slice().sort((a: any, b: any) => a.orden - b.orden)

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
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors"
          >
            <span>📊</span> Dashboard Global
          </Link>
          <Link
            href="/admin/usuarios"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors"
          >
            <span>👥</span> Usuarios
          </Link>
          <Link
            href="/admin/categorias"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors"
          >
            <span>🏷️</span> Categorías
          </Link>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 p-8 max-w-4xl">

          <Link href="/admin" className="text-slate-400 text-sm hover:text-white transition-colors">
            ← Volver al Dashboard Global
          </Link>

          {/* HEADER CURSO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 my-6 flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-yellow-500 text-xs font-bold uppercase tracking-widest">{curso.categoria}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  curso.estado === 'publicado'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : curso.estado === 'en_revision'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {ESTADO_LABEL[curso.estado] || curso.estado}
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1">{curso.titulo}</h1>
              <p className="text-slate-400 text-sm mb-3">{curso.descripcion}</p>
              <div className="flex gap-4 text-sm text-slate-400">
                <span className="text-yellow-500 font-bold">${curso.precio}</span>
                <span>Nivel: {curso.nivel}</span>
                <span>Docente: {curso.perfiles?.nombre || 'Sin asignar'}</span>
              </div>
            </div>

            {curso.estado === 'en_revision' && (
              <form action={aprobarCurso}>
                <input type="hidden" name="cursoId" value={curso.id} />
                <button
                  type="submit"
                  className="bg-green-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-green-400 transition-colors text-sm"
                >
                  ✓ Aprobar y publicar
                </button>
              </form>
            )}
          </div>

          {/* MODULOS */}
          <div className="space-y-6">
            {modulos.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">Este curso todavía no tiene módulos.</p>
              </div>
            ) : (
              modulos.map((modulo: any, index: number) => {
                const lecciones = (modulo.lecciones || []).slice().sort((a: any, b: any) => a.orden - b.orden)
                return (
                  <div key={modulo.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Módulo {index + 1}</span>
                      <h2 className="text-base font-bold">{modulo.titulo}</h2>
                    </div>
                    <div className="p-6 space-y-6">
                      {lecciones.length === 0 ? (
                        <p className="text-slate-500 text-sm">Sin lecciones todavía.</p>
                      ) : (
                        lecciones.map((leccion: any) => (
                          <div key={leccion.id}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-slate-500 text-xs font-mono">{leccion.orden}</span>
                              <span className="text-sm font-semibold">{leccion.titulo}</span>
                              {leccion.es_gratis && (
                                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Gratis</span>
                              )}
                            </div>
                            {leccion.video_url ? (
                              <VideoPlayer videoId={leccion.video_url} />
                            ) : (
                              <p className="text-slate-600 text-xs">Sin video subido.</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>
    </main>
  )
}
