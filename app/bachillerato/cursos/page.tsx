'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

const categorias = ['Todos', 'Algebra', 'Geometria', 'Trigonometria', 'Fisica', 'Estadistica']

export default function CursosBachilleratoPage() {
  const [cursos, setCursos] = useState<any[]>([])
  const [filtro, setFiltro] = useState('Todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargarCursos() {
      const res = await fetch('/api/cursos?nivel=bachillerato')
      const data = await res.json()
      setCursos(data)
      setLoading(false)
    }
    cargarCursos()
  }, [])

  const cursosFiltrados = filtro === 'Todos'
    ? cursos
    : cursos.filter(c => c.categoria === filtro)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* HEADER */}
      <div className="pt-28 pb-12 px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-3">
            ExactaLab Bachillerato
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Cursos de Bachillerato
          </h1>
          <p className="text-slate-400 max-w-xl">
            Álgebra, Geometría, Trigonometría, Física y más — explicados paso a paso, como tu profesor particular.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* FILTROS */}
        <div className="flex gap-3 flex-wrap mb-10">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltro(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                filtro === cat
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* CURSOS */}
        {loading ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-slate-400">Cargando cursos...</p>
          </div>
        ) : cursosFiltrados.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold mb-2">
              {filtro === 'Todos' ? 'Aún no hay cursos publicados' : `No hay cursos de ${filtro}`}
            </h2>
            <p className="text-slate-400 text-sm">Los cursos aparecerán aquí pronto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursosFiltrados.map((c: any) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-yellow-500/40 transition-all group"
              >
                <div className="h-36 bg-slate-800 flex items-center justify-center text-6xl relative overflow-hidden">
                  {c.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagen_url} alt={c.titulo} className="w-full h-full object-cover" />
                  ) : (
                    '📚'
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
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

      </div>
    </main>
  )
}