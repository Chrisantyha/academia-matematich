'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import BotonComprarPaquete from '@/components/curso/BotonComprarPaquete'

const categorias = ['Todos', 'Calculo', 'Algebra', 'Fisica', 'Estadistica', 'EDO']

export default function CursosPage() {
  const [cursos, setCursos] = useState<any[]>([])
  const [filtro, setFiltro] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [DESCUENTO_PAQUETE, setDescuentoPaquete] = useState(0)
  const [MINIMO_PAQUETE, setMinimoPaquete] = useState(999)

  useEffect(() => {
    async function cargarCursos() {
      const res = await fetch('/api/cursos')
      const data = await res.json()
      setCursos(data)
      setLoading(false)
    }
    async function cargarOferta() {
      const res = await fetch('/api/ofertas')
      const data = await res.json()
      setDescuentoPaquete(data.descuento)
      setMinimoPaquete(data.minimo)
    }
    cargarCursos()
    cargarOferta()
  }, [])

  // El catalogo general de alumno solo muestra cursos realmente comprables
  const cursosPublicados = cursos.filter((c) => c.estado === 'publicado')

  const cursosFiltrados = filtro === 'Todos'
    ? cursosPublicados
    : cursosPublicados.filter(c => c.categoria === filtro)

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function cancelarSeleccion() {
    setModoSeleccion(false)
    setSeleccionados([])
  }

  const cursosSeleccionados = cursos.filter((c) => seleccionados.includes(c.id))
  const subtotal = cursosSeleccionados.reduce((acc, c) => acc + Number(c.precio), 0)
  const descuentoAplica = seleccionados.length >= MINIMO_PAQUETE
  const total = descuentoAplica ? subtotal * (1 - DESCUENTO_PAQUETE / 100) : subtotal

  function handleExitoCompra() {
    setMostrarCheckout(false)
    cancelarSeleccion()
    window.location.reload()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* HEADER */}
      <div className="pt-28 pb-12 px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-3">
              Catálogo completo
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              Todos los cursos
            </h1>
            <p className="text-slate-400 max-w-xl">
              Ciencias exactas explicadas desde la raíz. Elige tu curso y empieza hoy.
            </p>
          </div>
          <button
            onClick={() => modoSeleccion ? cancelarSeleccion() : setModoSeleccion(true)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
              modoSeleccion
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20'
            }`}
          >
            {modoSeleccion ? 'Cancelar selección' : `🎁 Armar paquete (${MINIMO_PAQUETE}+ cursos, ${DESCUENTO_PAQUETE}% off)`}
          </button>
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
            {cursosFiltrados.map((c: any) => {
              const marcado = seleccionados.includes(c.id)
              return (
                <div
                  key={c.id}
                  onClick={() => modoSeleccion && alternarSeleccion(c.id)}
                  className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all group relative ${
                    modoSeleccion ? 'cursor-pointer' : ''
                  } ${
                    marcado
                      ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                      : 'border-slate-800 hover:-translate-y-1 hover:border-yellow-500/40'
                  }`}
                >
                  {modoSeleccion && (
                    <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      marcado ? 'bg-yellow-500 border-yellow-500' : 'bg-slate-900/80 border-slate-600'
                    }`}>
                      {marcado && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                  )}
                  <div className="h-36 bg-slate-800 flex items-center justify-center text-6xl relative overflow-hidden">
                    {c.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imagen_url} alt={c.titulo} className="w-full h-full object-cover" />
                    ) : (
                      '📚'
                    )}
                    {!modoSeleccion && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                      {c.categoria || 'Curso'}
                    </div>
                    <h3 className="text-base font-bold mb-2 leading-snug line-clamp-2 min-h-[2.75rem]">
                      {c.titulo}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">
                      {c.descripcion}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div>
                        <span className="text-yellow-500 text-xl font-bold">${c.precio}</span>
                        <span className="text-slate-600 text-xs ml-2">acceso de por vida</span>
                      </div>
                    </div>
                    {!modoSeleccion && (
                      <Link
                        href={`/cursos/${c.id}`}
                        className="block w-full mt-4 bg-yellow-500 text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors text-sm text-center"
                      >
                        Ver curso
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA SUSCRIPCION */}
        <div className="mt-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Accede a todos los cursos</h2>
          <p className="text-slate-400 mb-6">Suscríbete y estudia sin límites por un precio fijo al mes.</p>
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

      {/* BARRA FLOTANTE DE SELECCION */}
      {modoSeleccion && seleccionados.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-slate-400">
                {seleccionados.length} curso{seleccionados.length !== 1 ? 's' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}
                {!descuentoAplica && ` · selecciona ${MINIMO_PAQUETE - seleccionados.length} más para el descuento`}
              </p>
              <div className="flex items-baseline gap-2">
                {descuentoAplica && (
                  <span className="text-slate-500 text-sm line-through">${subtotal.toFixed(2)}</span>
                )}
                <span className="text-2xl font-bold text-yellow-500">${total.toFixed(2)}</span>
                {descuentoAplica && (
                  <span className="text-green-400 text-xs font-bold">-{DESCUENTO_PAQUETE}%</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setMostrarCheckout(true)}
              disabled={!descuentoAplica}
              className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Comprar paquete
            </button>
          </div>
        </div>
      )}

      {mostrarCheckout && (
        <BotonComprarPaquete
          cursoIds={seleccionados}
          onCerrar={() => setMostrarCheckout(false)}
          onExito={handleExitoCompra}
        />
      )}
    </main>
  )
}