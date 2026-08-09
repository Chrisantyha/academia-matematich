'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

const categorias = ['Todos', 'Suma', 'Resta', 'Multiplicacion', 'Division', 'Fracciones', 'Geometria']

const estrellas = Array.from({ length: 60 }).map((_, i) => ({
  top: (i * 37) % 100,
  left: (i * 53) % 100,
  size: (i % 3) + 1,
  opacity: 0.15 + ((i % 5) * 0.08),
}))

export default function CursosKidsPage() {
  const [cursos, setCursos] = useState<any[]>([])
  const [filtro, setFiltro] = useState('Todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargarCursos() {
      const res = await fetch('/api/cursos?nivel=kids')
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
    <main className="min-h-screen bg-[#0d0b26] text-white relative overflow-hidden">

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

        {/* HEADER */}
        <div className="pt-28 pb-12 px-8 border-b border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-3">
              ExactaKids
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              Cursos de ExactaKids
            </h1>
            <p className="text-white/60 max-w-xl">
              Sumas, restas, multiplicaciones y más — cada curso parte de una situación cotidiana, explorando junto a Nova.
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
                    ? 'bg-amber-300 text-[#0d0b26] border-amber-300'
                    : 'bg-transparent text-white/60 border-white/20 hover:border-white/40 hover:text-white'
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
              <p className="text-white/60">Cargando cursos...</p>
            </div>
          ) : cursosFiltrados.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-xl font-bold mb-2">
                {filtro === 'Todos' ? 'Aún no hay cursos publicados' : `No hay cursos de ${filtro}`}
              </h2>
              <p className="text-white/60 text-sm">Los cursos aparecerán aquí pronto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursosFiltrados.map((c: any) => (
                <div
                  key={c.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-amber-300/40 transition-all group"
                >
                  <div className="h-36 bg-white/10 flex items-center justify-center text-6xl relative overflow-hidden">
                    {c.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imagen_url} alt={c.titulo} className="w-full h-full object-cover" />
                    ) : (
                      '🚀'
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                  </div>
                  <div className="p-5">
                    <div className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-2">
                      {c.categoria || 'Curso'}
                    </div>
                    <h3 className="text-base font-bold mb-2 leading-snug">
                      {c.titulo}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                      {c.descripcion}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div>
                        <span className="text-amber-300 text-xl font-bold">${c.precio}</span>
                        <span className="text-white/40 text-xs ml-2">acceso de por vida</span>
                      </div>
                    </div>
                    <Link
                      href={`/cursos/${c.id}`}
                      className="block w-full mt-4 bg-amber-300 text-[#0d0b26] font-bold py-2.5 rounded-xl hover:bg-amber-200 transition-colors text-sm text-center"
                    >
                      Ver curso
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}