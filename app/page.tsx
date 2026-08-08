import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Latex from '@/components/ui/Latex'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const formulasTicker = [
  'F = ma',
  'E = mc^2',
  'a^2 + b^2 = c^2',
  '\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1',
  '\\frac{d}{dx} e^x = e^x',
  '\\det(A) = 0',
  '\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}',
  '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}',
]

export default async function Home() {
  const supabase = await createServerSupabaseClient()

  const { data: cursos } = await supabase
    .from('cursos')
    .select('*')
    .eq('estado', 'publicado')
    .order('created_at', { ascending: false })
    .limit(6)

  const totalCursos = cursos?.length || 0

  return (
    <main className="min-h-screen bg-slate-950">

      <Navbar />

      <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-24">

        <div className="inline-flex items-center gap-2 border border-yellow-500 text-yellow-500 px-4 py-1 rounded-full text-xs font-bold uppercase mb-8">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          Plataforma de Ciencias Exactas · LATAM
        </div>

        <h1 className="text-6xl font-bold tracking-tight leading-tight max-w-4xl mb-6 text-white">
          Matemáticas que{' '}
          <em className="not-italic text-yellow-500">finalmente</em>
          <br />tienen sentido
        </h1>

        <p className="text-slate-400 text-xl max-w-xl mb-6 leading-relaxed">
          Física, Álgebra, Cálculo y más — explicados desde la raíz.
          No memorizas: <strong className="text-white">entiendes</strong>.
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <Link href="/cursos" className="bg-yellow-500 text-black font-bold px-8 py-4 rounded-xl hover:bg-yellow-400 transition-all">
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

      <div className="overflow-hidden border-y border-slate-800 bg-slate-900 py-3">
        <div className="flex gap-16 whitespace-nowrap animate-ticker w-max">
          {[...formulasTicker, ...formulasTicker].map((formula, index) => (
            <span
              key={index}
              className={`text-sm ${index % 2 === 0 ? 'text-slate-500' : 'text-yellow-500'}`}
            >
              <Latex formula={formula} />
            </span>
          ))}
        </div>
      </div>

      <section className="px-8 py-16">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Cursos disponibles</h2>
          <Link href="/cursos" className="text-sm text-yellow-500 font-semibold">Ver todos</Link>
        </div>

        {totalCursos === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="text-lg font-bold text-white mb-2">Próximamente</h3>
            <p className="text-slate-400 text-sm">Estamos preparando los primeros cursos. Vuelve pronto.</p>
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