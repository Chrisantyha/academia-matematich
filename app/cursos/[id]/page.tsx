import Navbar from '@/components/layout/Navbar'
import VideoPlayer from '@/components/curso/VideoPlayer'
import { getCursoPorId } from '@/lib/db'

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const curso = await getCursoPorId(id)

  if (!curso) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-2">Curso no encontrado</h1>
          <p className="text-slate-400">El curso que buscas no existe.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-8 pt-28 pb-16">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* COLUMNA IZQUIERDA — VIDEO + INFO */}
          <div className="lg:col-span-2">

            {/* VIDEO PLAYER */}
            {curso.lecciones && curso.lecciones.length > 0 && curso.lecciones[0].video_url ? (
              <VideoPlayer
                videoId={curso.lecciones[0].video_url}
                titulo={curso.lecciones[0].titulo}
              />
            ) : (
              <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center aspect-video">
                <div className="text-center">
                  <div className="text-5xl mb-3">🎬</div>
                  <p className="text-slate-400 text-sm">Video proximamente</p>
                </div>
              </div>
            )}

            {/* INFO DEL CURSO */}
            <div className="mt-6">
              <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                {curso.categoria}
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-3">
                {curso.titulo}
              </h1>
              <p className="text-slate-400 leading-relaxed mb-6">
                {curso.descripcion}
              </p>

              {/* DOCENTE */}
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center text-yellow-500 font-bold">
                  {curso.perfiles?.nombre?.charAt(0) || 'D'}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Docente</div>
                  <div className="font-semibold">{curso.perfiles?.nombre || 'Docente'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA — LECCIONES + COMPRA */}
          <div className="lg:col-span-1">

            {/* CARD DE COMPRA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 sticky top-24">
              <div className="text-4xl font-bold text-yellow-500 mb-1">${curso.precio}</div>
              <div className="text-slate-500 text-sm mb-4">acceso de por vida</div>

              <button className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors mb-3">
                Comprar curso
              </button>
              <button className="w-full border border-slate-700 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm">
                Ver leccion gratis
              </button>

              <div className="mt-5 pt-5 border-t border-slate-800">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Este curso incluye
                </div>
                {[
                  '✅ Acceso de por vida',
                  '✅ Video en HD protegido',
                  '✅ Ejercicios resueltos',
                  '✅ Certificado de completacion',
                  '✅ PC, Android e iOS',
                ].map((item) => (
                  <div key={item} className="text-sm text-slate-400 py-1">{item}</div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* LECCIONES */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Contenido del curso</h2>

          {curso.lecciones && curso.lecciones.length > 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {curso.lecciones
                .sort((a: any, b: any) => a.orden - b.orden)
                .map((leccion: any, index: number) => (
                <div
                  key={leccion.id}
                  className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{leccion.titulo}</div>
                    {leccion.duracion_minutos && (
                      <div className="text-xs text-slate-500 mt-0.5">{leccion.duracion_minutos} min</div>
                    )}
                  </div>
                  {leccion.es_gratis ? (
                    <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-1 rounded-lg">
                      Gratis
                    </span>
                  ) : (
                    <span className="text-slate-600 text-lg">🔒</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-slate-400 text-sm">Las lecciones se agregaran pronto.</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}