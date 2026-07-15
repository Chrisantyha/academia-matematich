import Navbar from '@/components/layout/Navbar'
import LeccionPlayer from '@/components/curso/LeccionPlayer'
import BotonComprar from '@/components/curso/BotonComprar'
import { getCursoPorId } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const curso = await getCursoPorId(id)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let progresoInicial: string[] = []
  let tieneElCurso = false

  if (user) {
    const { data } = await supabase
      .from('progreso')
      .select('leccion_id')
      .eq('alumno_id', user.id)
      .eq('completado', true)
    progresoInicial = data?.map((p: any) => p.leccion_id) || []

    // Verificar si ya compró el curso (solo cuenta si el pago fue aprobado)
    const { data: compra } = await supabase
      .from('compras')
      .select('id')
      .eq('alumno_id', user.id)
      .eq('curso_id', id)
      .eq('estado', 'aprobado')
      .single()

    tieneElCurso = !!compra
  }

  const { data: modulos } = await supabase
    .from('modulos')
    .select(`
      *,
      lecciones!lecciones_modulo_id_fkey (*),
      evaluaciones!evaluaciones_modulo_id_fkey (id, titulo)
    `)
    .eq('curso_id', id)
    .order('orden', { ascending: true })

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

  const todasLasLecciones = modulos
    ? modulos.flatMap((m: any) => m.lecciones || [])
    : curso.lecciones || []

  const modulosConEval = modulos?.map((m: any) => ({
    ...m,
    evaluacion: m.evaluaciones?.[0] || null,
  })) || []

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-8 pt-28 pb-16">

        <div className="mb-6">
          <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
            {curso.categoria}
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {curso.titulo}
          </h1>
          <p className="text-slate-400">{curso.descripcion}</p>
        </div>

        {tieneElCurso ? (
          // ALUMNO CON ACCESO — muestra el player
          todasLasLecciones.length > 0 ? (
            <LeccionPlayer
              lecciones={todasLasLecciones}
              modulos={modulosConEval}
              cursoId={id}
              progresoInicial={progresoInicial}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">🎬</div>
              <h2 className="text-xl font-bold mb-2">Proximamente</h2>
              <p className="text-slate-400 text-sm">Las lecciones se agregaran pronto.</p>
            </div>
          )
        ) : (
          // ALUMNO SIN ACCESO — muestra preview y boton de compra
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* PREVIEW */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="h-64 bg-slate-800 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <p className="text-slate-400 text-sm">Compra el curso para acceder al contenido</p>
                  </div>
                </div>
              </div>

              {/* LISTA DE LECCIONES BLOQUEADAS */}
              {todasLasLecciones.length > 0 && (
                <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800">
                    <h3 className="font-bold">Contenido del curso</h3>
                    <p className="text-slate-400 text-sm">{todasLasLecciones.length} lecciones</p>
                  </div>
                  {todasLasLecciones.map((leccion: any) => (
                    <div key={leccion.id} className="flex items-center gap-3 px-6 py-3 border-b border-slate-800 last:border-0">
                      <span className="text-slate-600">🔒</span>
                      <span className="text-slate-400 text-sm">{leccion.titulo}</span>
                      {leccion.es_gratis && (
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded ml-auto">Gratis</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CARD DE COMPRA */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-24">
                <div className="text-4xl font-bold text-yellow-500 mb-1">${curso.precio}</div>
                <div className="text-slate-500 text-sm mb-6">acceso de por vida</div>

                <BotonComprar
                  cursoId={id}
                  precio={curso.precio}
                  titulo={curso.titulo}
                />

                <div className="mt-6 pt-6 border-t border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                    Este curso incluye
                  </div>
                  {[
                    '✅ Acceso de por vida',
                    '✅ Video en HD protegido',
                    '✅ Ejercicios resueltos',
                    '✅ Certificado de completación',
                    '✅ PC, Android e iOS',
                  ].map((item) => (
                    <div key={item} className="text-sm text-slate-400 py-1">{item}</div>
                  ))}
                </div>

                <div className="mt-4 text-center">
                  <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Docente</div>
                  <div className="font-semibold text-sm">{curso.perfiles?.nombre || 'Docente'}</div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  )
}