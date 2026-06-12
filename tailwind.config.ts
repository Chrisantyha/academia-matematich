import Link from 'next/link'

const cursos = [
  { icono: '∫', tag: 'Calculo I', nombre: 'Calculo Diferencial desde cero', lecciones: 48, precio: '$9', nuevo: true, bg: 'from-[#0f1e35] to-[#1a2d50]' },
  { icono: 'A', tag: 'Algebra Lineal', nombre: 'Matrices y Sistemas de Ecuaciones', lecciones: 42, precio: '$9', nuevo: false, bg: 'from-[#1a1030] to-[#2d1a50]' },
  { icono: 'S', tag: 'Calculo II', nombre: 'Calculo Integral y Series', lecciones: 51, precio: '$9', nuevo: false, bg: 'from-[#0a1a10] to-[#122518]' },
  { icono: 'F', tag: 'Fisica I', nombre: 'Mecanica Clasica', lecciones: 38, precio: '$9', nuevo: true, bg: 'from-[#001520] to-[#002030]' },
  { icono: 'D', tag: 'Calculo III', nombre: 'Calculo Multivariable', lecciones: 44, precio: '$9', nuevo: false, bg: 'from-[#101520] to-[#182030]' },
  { icono: 'P', tag: 'Algebra', nombre: 'Funciones y Polinomios', lecciones: 36, precio: '$9', nuevo: false, bg: 'from-[#1a1000] to-[#2d1f00]' },
]

const formulas = ['F = ma', 'E = mc2', 'd/dx[ex] = ex', 'a2+b2=c2', 'lim sin(x)/x = 1']

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0F1A]">

      <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-24">

        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          Plataforma de Ciencias Exactas · LATAM
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight max-w-4xl mb-6">
          Matematicas que{' '}
          <em className="not-italic text-yellow-500">finalmente</em>
          <br />tienen sentido
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
          Fisica, Algebra, Calculo y mas — explicados desde la raiz.
          No memorizas: <strong className="text-white">entiendes</strong>.
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <Link href="/cursos" className="bg-yellow-500 text-black font-bold px-8 py-4 rounded-xl hover:bg-yellow-400 transition-all hover:-translate-y-1">
            Ver cursos
          </Link>
          <Link href="#precios" className="border border-slate-700 text-white font-semibold px-8 py-4 rounded-xl hover:bg-slate-800 transition-colors">
            Ver precios
          </Link>
        </div>

        <div className="flex gap-12 flex-wrap justify-center">
          {[['12+','Cursos'],['$9','Por curso'],['Acceso','De por vida'],['DRM','Video protegido']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="text-4xl font-bold text-yellow-500 tracking-tight">{n}</div>
              <div className="text-sm text-slate-600 mt-1">{l}</div>
            </div>
          ))}
        </div>

      </section>

      <div className="overflow-hidden border-y border-slate-800 bg-slate-900 py-3">
        <div className="flex gap-12 whitespace-nowrap animate-ticker">
          {[...formulas, ...formulas].map((f, i) => (
            <span key={i} className="font-mono text-sm flex-shrink-0 text-slate-600">
              {f}
            </span>
          ))}
        </div>
      </div>

      <section className="px-8 py-16">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Cursos disponibles</h2>
          <Link href="/cursos" className="text-sm text-yellow-500 font-semibold">Ver todos</Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3">
          {cursos.map((c) => (
            <div key={c.nombre} className="flex-shrink-0 w-52 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-yellow-500/40 transition-all">
              <div className={`h-28 bg-gradient-to-br ${c.bg} flex items-center justify-center text-5xl`}>
                {c.icono}
              </div>
              <div className="p-3">
                <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-1">{c.tag}</div>
                <div className="text-sm font-semibold leading-snug mb-3">{c.nombre}</div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-500 font-bold">{c.precio}</span>
                  <span className="text-slate-500 text-xs">{c.lecciones} lec.</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </section>

    </main>
  )
}