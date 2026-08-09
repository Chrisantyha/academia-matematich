'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'



const estrellas = Array.from({ length: 60 }).map((_, i) => ({
  top: (i * 37) % 100,
  left: (i * 53) % 100,
  size: (i % 3) + 1,
  opacity: 0.15 + ((i % 5) * 0.08),
}))

export default function CursosKidsPage() {
  const [cursos, setCursos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
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

  const texto = busqueda.trim().toLowerCase()
  const cursosFiltrados = texto === ''
    ? cursos
    : cursos.filter(c =>
        (c.titulo || '').toLowerCase().includes(texto) ||
        (c.descripcion || '').toLowerCase().includes(texto) ||
        (c.categoria || '').toLowerCase().includes(texto)
      )

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

          {/* BUSCADOR */}
          <div className="mb-10">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por curso o tema (ej: sumas, fracciones...)"
              className="w-full max-w-md bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-amber-300 transition-colors"
            />
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
                {texto === '' ? 'Aún no hay cursos publicados' : `No hay cursos que coincidan con "${busqueda}"`}
              </h2>
              <p className="text-white/60 text-sm">Los cursos aparecerán aquí pronto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {cursosFiltrados.map((c: any) => {
                const esProximamente = c.estado !== 'publicado'
                return (
                  <div
                    key={c.id}
                    className={`bg-white/5 border rounded-2xl overflow-hidden transition-all group relative flex flex-col h-full min-h-[320px] ${
                      esProximamente
                        ? 'border-white/10 opacity-70'
                        : 'border-white/10 cursor-pointer hover:-translate-y-1 hover:border-amber-300/40'
                    }`}
                  >
                    {esProximamente && (
                      <span className="absolute top-3 right-3 z-10 bg-amber-300/90 text-[#0d0b26] text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                        Próximamente
                      </span>
                    )}
                    <div className="h-28 bg-white/10 flex items-center justify-center text-5xl relative overflow-hidden shrink-0">
                      {c.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imagen_url} alt={c.titulo} className="w-full h-full object-cover" />
                      ) : (
                        '🚀'
                      )}
                      {!esProximamente && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-2">
                        {c.categoria || 'Curso'}
                      </div>
                      <h3 className="text-base font-bold mb-2 leading-snug line-clamp-2">
                        {c.titulo}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                        {c.descripcion}
                      </p>
                      {esProximamente ? (
                        <div className="w-full mt-4 border border-white/20 text-white/50 font-semibold py-2.5 rounded-xl text-sm text-center">
                          Próximamente
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}