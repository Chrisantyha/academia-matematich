import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Latex from '@/components/ui/Latex'

const formulasTicker = [
  '2 + 3 = 5',
  'x^2 + 5x + 6 = 0',
  '\\sin(\\theta) = \\frac{opuesto}{hipotenusa}',
  '\\frac{d}{dx} e^x = e^x',
  '4 \\times 6 = 24',
  '\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1',
  '\\sqrt{16} = 4',
  '\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}',
]

export default function LandingSeleccion() {
  return (
    <main className="min-h-screen bg-slate-950">

      <Navbar />

      <div className="text-center mb-12 max-w-2xl mx-auto pt-40 px-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 text-white">
          ExactaLab
        </h1>
        <p className="text-slate-400 text-lg">
          Elige tu nivel para empezar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto px-4 pb-16">

        {/* ExactaKids */}
        <Link
          href="/kids"
          className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 p-8 min-h-[340px] overflow-hidden bg-slate-900 transition-transform hover:scale-[1.02]"
        >
          <div>
            <span className="block text-center text-sm font-bold tracking-wide uppercase text-amber-300 mb-4">
              Escuela · 6-10 años
            </span>
            <h2 className="text-2xl font-bold mb-3 leading-tight text-white">
              Matemáticas para tu hij@, sin miedo ni frustración
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
              Sumas, restas, multiplicaciones y más — aprende explorando
              junto a Nova, en un viaje por el universo de los números.
            </p>
          </div>
          <span className="mt-6 inline-flex w-fit items-center rounded-full bg-amber-300/10 border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-300 group-hover:bg-amber-300/20 transition-colors">
            Ver próximamente
          </span>
        </Link>

        {/* ExactaLab Bachillerato */}
        <Link
          href="/bachillerato"
          className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 p-8 min-h-[340px] overflow-hidden bg-slate-900 transition-transform hover:scale-[1.02]"
        >
          <div>
            <span className="block text-center text-sm font-bold tracking-wide uppercase text-yellow-500 mb-4">
              Secundaria · Colegio
            </span>
            <h2 className="text-2xl font-bold mb-3 leading-tight text-white">
              ¿No entiendes la materia? Aquí la explicamos paso a paso
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
              Álgebra, Geometría, Cálculo y más — como tener un profesor
              particular explicando justo lo que no te quedó claro.
            </p>
          </div>
          <span className="mt-6 inline-flex w-fit items-center rounded-full bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 text-sm font-semibold text-yellow-500 group-hover:bg-yellow-500/20 transition-colors">
            Ver próximamente
          </span>
        </Link>

        {/* ExactaLab Universitario */}
        <Link
          href="/universitario"
          className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 p-8 min-h-[340px] overflow-hidden bg-slate-900 transition-transform hover:scale-[1.02]"
        >
          <div>
            <span className="block text-center text-sm font-bold tracking-wide uppercase text-yellow-500 mb-4">
              Universidad · LATAM
            </span>
            <h2 className="text-2xl font-bold mb-3 leading-tight text-white">
              Cálculo, Álgebra Lineal y Ecuaciones Diferenciales, desde cero
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
              El repaso serio que necesitas para nivelarte antes del
              semestre o reforzar lo que ya viste en clase.
            </p>
          </div>
          <span className="mt-6 inline-flex w-fit items-center rounded-full bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 text-sm font-semibold text-yellow-500 group-hover:bg-yellow-500/20 transition-colors">
            Explorar cursos
          </span>
        </Link>

      </div>

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

    </main>
  )
}