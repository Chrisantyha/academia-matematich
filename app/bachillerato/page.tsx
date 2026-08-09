import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function BachilleratoPage() {
  const supabase = await createServerSupabaseClient()

  const { data: cursos } = await supabase
    .from('cursos')
    .select('*')
    .eq('estado', 'publicado')
    .eq('nivel', 'bachillerato')
    .order('created_at', { ascending: false })

  const totalCursos = cursos?.length || 0

  return (
    <main className="min-h-screen bg-slate-950">

      <Navbar />

      <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-24">

        <div className="inline-flex items-center gap-2 border border-yellow-500 text-yellow-500 px-4 py-1 rounded-full text-xs font-bold uppercase mb-8">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          ExactaLab Bachillerato · Secundaria
        </div>

        <h1 className="text-6xl font-bold tracking-tight leading-tight max-w-4xl mb-6 text-white">
          ¿No entiendes la materia?
          <br />Aquí la explicamos <em className="not-italic text-yellow-500">paso a paso</em>
        </h1>

        <p className="text-slate-400 text-xl max-w-xl mb-6 leading-relaxed">
          Álgebra, Geometría, Cálculo y más — como tener un profesor
          particular explicando justo lo que <strong className="text-white">no te quedó claro</strong>.
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <Link href="/bachillerato/cursos" className="bg-yellow-500 text-black font-bold px-8 py-4 rounded-xl hover:bg-yellow-400 transition-all">
            Ver cursos
          </Link>
        </div>

        <div className="flex gap-12 flex-wrap justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-500">{totalCursos}</div>
            <div className="text-sm text-slate-600 mt-1">Cursos</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-500">∞</div>
            <div className="text-sm text-slate-600 mt-1">Acceso de por vida</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-500">🔒</div>
            <div className="text-sm text-slate-600 mt-1">Video protegido</div>
          </div>
        </div>

      </section>

      <section className="px-8 py-16">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Cursos disponibles</h2>
          <Link href="/bachillerato/cursos" className="text-sm text-yellow-500 font-semibold">Ver todos</Link>
        </div>

        {totalCursos === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="text-lg font-bold text-white mb-2">Próximamente</h3>
            <p className="text-slate-400 text-sm">Estamos preparando los primeros cursos de Bachillerato. Vuelve pronto.</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {cursos!.map((c: any) => (
              <Link
                key={c.id}
                href={`/cursos/${c.id}`}
                className="flex-shrink-0 w-52 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all"
              >
                <div className="h-28 bg-slate-800 flex items-center justify-center text-5xl overflow-hidden">
                  {c.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagen_url} alt={c.titulo} className="w-full h-full object-cover" />
                  ) : (
                    '📚'
                  )}
                </div>
                <div className="p-3">
                  <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-1">{c.categoria}</div>
                  <div className="text-sm font-semibold text-white leading-snug mb-3">{c.titulo}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-500 font-bold">${c.precio}</span>
                    <span className="text-slate-500 text-xs">{c.nivel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </section>

    </main>
  )
}