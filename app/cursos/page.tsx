import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

const cursos = [
  { icono: '∫', tag: 'Calculo I', nombre: 'Calculo Diferencial desde cero', lecciones: 48, precio: '$9', nuevo: true, descripcion: 'Domina limites, derivadas y optimizacion entendiendo el porqué geometrico de cada concepto.' },
  { icono: 'A', tag: 'Algebra Lineal', nombre: 'Matrices y Sistemas de Ecuaciones', lecciones: 42, precio: '$9', nuevo: false, descripcion: 'Determinantes, transformaciones lineales y espacios vectoriales explicados desde la raiz.' },
  { icono: 'S', tag: 'Calculo II', nombre: 'Calculo Integral y Series', lecciones: 51, precio: '$9', nuevo: false, descripcion: 'Integrales definidas e indefinidas, tecnicas de integracion y series de Taylor.' },
  { icono: '⚡', tag: 'Fisica I', nombre: 'Mecanica Clasica', lecciones: 38, precio: '$9', nuevo: true, descripcion: 'Cinematica, dinamica, trabajo y energia con modelado matematico real.' },
  { icono: 'D', tag: 'Calculo III', nombre: 'Calculo Multivariable', lecciones: 44, precio: '$9', nuevo: false, descripcion: 'Funciones de varias variables, gradientes, integrales multiples y teorema de Stokes.' },
  { icono: 'P', tag: 'Algebra', nombre: 'Funciones y Polinomios', lecciones: 36, precio: '$9', nuevo: false, descripcion: 'Funciones, polinomios, logaritmos y trigonometria. La base solida que todo universitario necesita.' },
  { icono: '∇', tag: 'EDO', nombre: 'Ecuaciones Diferenciales', lecciones: 39, precio: '$9', nuevo: false, descripcion: 'Metodos de resolucion de EDO con aplicaciones en fisica e ingenieria.' },
  { icono: '🔋', tag: 'Fisica II', nombre: 'Electromagnetismo', lecciones: 41, precio: '$9', nuevo: false, descripcion: 'Campos electricos y magneticos, ley de Gauss, induccion electromagnetica.' },
  { icono: '📊', tag: 'Estadistica', nombre: 'Probabilidad y Estadistica', lecciones: 35, precio: '$9', nuevo: true, descripcion: 'Distribuciones, inferencia estadistica y regresion con ejemplos reales.' },
]

const categorias = ['Todos', 'Calculo', 'Algebra', 'Fisica', 'Estadistica', 'EDO']

export default function CursosPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* HEADER */}
      <div className="pt-28 pb-12 px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-3">
            Catalogo completo
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Todos los cursos
          </h1>
          <p className="text-slate-400 max-w-xl">
            Ciencias exactas explicadas desde la raiz. Elige tu curso y empieza hoy.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* FILTROS */}
        <div className="flex gap-3 flex-wrap mb-10">
          {categorias.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                cat === 'Todos'
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GRID DE CURSOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map((c) => (
            <div
              key={c.nombre}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-yellow-500/40 transition-all group"
            >
              {/* THUMBNAIL */}
              <div className="h-36 bg-slate-800 flex items-center justify-center text-6xl relative">
                {c.icono}
                <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-3xl">▶</span>
                </div>
                {c.nuevo && (
                  <span className="absolute top-3 right-3 bg-sky-400/10 text-sky-400 text-xs font-bold px-2 py-1 rounded-lg border border-sky-400/30">
                    NUEVO
                  </span>
                )}
              </div>

              {/* BODY */}
              <div className="p-5">
                <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                  {c.tag}
                </div>
                <h3 className="text-base font-bold mb-2 leading-snug">
                  {c.nombre}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {c.descripcion}
                </p>

                {/* FOOTER */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div>
                    <span className="text-yellow-500 text-xl font-bold">{c.precio}</span>
                    <span className="text-slate-600 text-xs ml-2">acceso de por vida</span>
                  </div>
                  <span className="text-slate-500 text-xs">{c.lecciones} lecciones</span>
                </div>

                <button className="w-full mt-4 bg-yellow-500 text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors text-sm">
                  Comprar curso
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA SUSCRIPCION */}
        <div className="mt-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Accede a todos los cursos</h2>
          <p className="text-slate-400 mb-6">Suscribete y estudia sin limites por un precio fijo al mes.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">$12</div>
              <div className="text-sm text-slate-500">por mes</div>
            </div>
            <div className="flex items-center text-slate-600">vs</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-400 line-through">$81</div>
              <div className="text-sm text-slate-500">cursos por separado</div>
            </div>
          </div>
          <button className="mt-6 bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors">
            Suscribirme ahora
          </button>
        </div>

      </div>
    </main>
  )
}