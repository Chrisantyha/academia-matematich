import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Latex from '@/components/ui/Latex'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const formulasTicker = [
  '2 + 3 = 5',
  '10 - 4 = 6',
  '4 \\times 6 = 24',
  '12 \\div 3 = 4',
  '\\sqrt{16} = 4',
  '7 + 8 = 15',
  '5 \\times 5 = 25',
  '\\frac{1}{2} + \\frac{1}{2} = 1',
]

// Estrellas fijas (sin animación), posiciones y tamaños pseudo-aleatorios pero deterministas
const estrellas = Array.from({ length: 60 }).map((_, i) => ({
  top: (i * 37) % 100,
  left: (i * 53) % 100,
  size: (i % 3) + 1,
  opacity: 0.15 + ((i % 5) * 0.08),
}))

export default async function KidsPage() {
  const supabase = await createServerSupabaseClient()

  const { count } = await supabase
    .from('cursos')
    .select('*', { count: 'exact', head: true })
    .or('estado.eq.publicado,visible_proximamente.eq.true')
    .eq('nivel', 'kids')

  const totalCursos = count || 0

  return (
    <main className="min-h-screen bg-[#0d0b26] relative overflow-hidden">

      {/* Estrellas de fondo, baja opacidad, sin movimiento */}
      <div className="absolute inset-0 pointer-events-none">
        {estrellas.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <Navbar />

        <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-24">

          <div className="inline-flex items-center gap-2 border border-amber-300 text-amber-300 px-4 py-1 rounded-full text-xs font-bold uppercase mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
            ExactaKids · Escuela 6-10 años
          </div>

          <h1 className="text-6xl font-bold tracking-tight leading-tight max-w-4xl mb-6 text-white">
            Matemáticas para tu hij@,
            <br />sin miedo ni <em className="not-italic text-amber-300">frustración</em>
          </h1>

          <p className="text-white/70 text-xl max-w-xl mb-6 leading-relaxed">
            Sumas, restas, multiplicaciones y más — aprende explorando
            junto a <strong className="text-white">Nova</strong>, en un viaje por el universo de los números.
          </p>

          <div className="flex gap-4 flex-wrap justify-center mb-16">
            <Link href="/kids/cursos" className="bg-amber-300 text-[#0d0b26] font-bold px-8 py-4 rounded-xl hover:bg-amber-200 transition-all">
              Ver cursos
            </Link>
          </div>

          <div className="flex gap-12 flex-wrap justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-300">{totalCursos}</div>
              <div className="text-sm text-white/50 mt-1">Cursos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-300">∞</div>
              <div className="text-sm text-white/50 mt-1">Acceso de por vida</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-300">🔒</div>
              <div className="text-sm text-white/50 mt-1">Video protegido</div>
            </div>
          </div>

        </section>

        <div className="overflow-hidden border-y border-white/10 bg-white/5 py-3">
          <div className="flex gap-16 whitespace-nowrap animate-ticker w-max">
            {[...formulasTicker, ...formulasTicker].map((formula, index) => (
              <span
                key={index}
                className={`text-sm ${index % 2 === 0 ? 'text-white/40' : 'text-amber-300'}`}
              >
                <Latex formula={formula} />
              </span>
            ))}
          </div>
        </div>
      </div>

    </main>
  )
}