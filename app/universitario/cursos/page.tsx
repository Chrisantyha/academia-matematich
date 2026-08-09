'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'



export default function CursosUniversitarioPage() {
  const [cursos, setCursos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargarCursos() {
      const res = await fetch('/api/cursos?nivel=universitario')
      const data = await res.json()
      setCursos(data)
      setLoading(false)
    }
    cargarCursos()
  }, [])

  const texto = busqueda.trim().toLowerCase()
  const cursosFiltrados = texto === ''
    ? cursos
    : cursos.filter(c =>
        (c.titulo || '').toLowerCase().includes(texto) ||
        (c.descripcion || '').toLowerCase().includes(texto) ||
        (c.categoria || '').toLowerCase().includes(texto)
      )

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* HEADER */}
      <div className="pt-28 pb-12 px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-3">
            ExactaLab Universitario
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Cursos Universitarios
          </h1>
          <p className="text-slate-400 max-w-xl">
            Cálculo, Álgebra, Física y más — explicados desde la raíz. Sin memorizar, entendiendo.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* BUSCADOR */}
        <div className="mb-10">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por curso o tema (ej: cálculo, álgebra...)"
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
          />
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
              {texto === '' ? 'Aún no hay cursos publicados' : `No hay cursos que coincidan con "${busqueda}"`}
            </h2>
            <p className="text-slate-400 text-sm">Los cursos aparecerán aquí pronto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cursosFiltrados.map((c: any) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-yellow-500/40 transition-all group flex flex-col h-full min-h-[320px]"
              >
                <div className="h-28 bg-slate-800 flex items-center justify-center text-5xl relative overflow-hidden shrink-0">
                  {c.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagen_url} alt={c.titulo} className="w-full h-full object-cover" />
                  ) : (
                    '📚'
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                    {c.categoria || 'Curso'}
                  </div>
                  <h3 className="text-base font-bold mb-2 leading-snug line-clamp-2">
                    {c.titulo}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
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