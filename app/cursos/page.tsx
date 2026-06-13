import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { getCursos } from '@/lib/db'

const categorias = ['Todos', 'Calculo', 'Algebra', 'Fisica', 'Estadistica', 'EDO']

export default async function CursosPage() {
  const cursos = await getCursos()

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

        {/* CURSOS DESDE DB */}
        {cursos.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold mb-2">Aun no hay cursos publicados</h2>
            <p className="text-slate-400 text-sm">Los cursos apareceran aqui cuando sean publicados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursos.map((c: any) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-yellow-500/40 transition-all group"
              >
                <div className="h-36 bg-slate-800 flex items-center justify-center text-6xl relative">
                  📚
                  <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-3xl">▶</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                    {c.categoria || 'Curso'}
                  </div>
                  <h3 className="text-base font-bold mb-2 leading-snug">
                    {c.titulo}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    {c.descripcion}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <div>
                      <span className="text-yellow-500 text-xl font-bold">${c.precio}</span>
                      <span className="text-slate-600 text-xs ml-2">acceso de por vida</span>
                    </div>
                  </div>
                  <Link
                    href={`/cursos/${c.id}`}
                    className="block w-full mt-4 bg-yellow-500 text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors text-sm text-center"
                  >
                    Ver curso
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA SUSCRIPCION */}
        <div className="mt-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Accede a todos los cursos</h2>
          <p className="text-slate-400 mb-6">Suscribete y estudia sin limites por un precio fijo al mes.</p>
          <div className="flex gap-4 justify-center flex-wrap items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">$12</div>
              <div className="text-sm text-slate-500">por mes</div>
            </div>
            <div className="text-slate-600">vs</div>
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