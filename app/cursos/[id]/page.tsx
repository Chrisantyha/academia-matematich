import Navbar from '@/components/layout/Navbar'
import LeccionPlayer from '@/components/curso/LeccionPlayer'
import { getCursoPorId } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const curso = await getCursoPorId(id)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let progresoInicial: string[] = []
  if (user) {
    const { data } = await supabase
      .from('progreso')
      .select('leccion_id')
      .eq('alumno_id', user.id)
      .eq('completado', true)
    progresoInicial = data?.map((p: any) => p.leccion_id) || []
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

        {todasLasLecciones.length > 0 ? (
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
        )}

        <div className="mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Docente</div>
            <div className="font-semibold">{curso.perfiles?.nombre || 'Docente'}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">${curso.precio}</div>
            <div className="text-xs text-slate-500">acceso de por vida</div>
          </div>
          <button className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors">
            Comprar curso
          </button>
        </div>

      </div>
    </main>
  )
}