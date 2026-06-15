'use client'

import { useState } from 'react'
import VideoPlayer from './VideoPlayer'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Leccion {
  id: string
  titulo: string
  video_url: string
  duracion_minutos: number
  es_gratis: boolean
  orden: number
  modulo_id: string | null
}

interface Modulo {
  id: string
  titulo: string
  orden: number
  lecciones: Leccion[]
  evaluacion?: { id: string; titulo: string } | null
}

interface LeccionPlayerProps {
  lecciones: Leccion[]
  modulos: Modulo[]
  cursoId: string
  progresoInicial: string[]
}

export default function LeccionPlayer({ lecciones, modulos, cursoId, progresoInicial }: LeccionPlayerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [leccionActual, setLeccionActual] = useState(lecciones[0])
  const [completadas, setCompletadas] = useState<string[]>(progresoInicial)
  const [guardando, setGuardando] = useState(false)

  const porcentaje = Math.round((completadas.length / lecciones.length) * 100)

  async function marcarCompletada() {
    if (completadas.includes(leccionActual.id)) return
    setGuardando(true)
    try {
      const response = await fetch('/api/progreso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leccionId: leccionActual.id }),
      })
      const data = await response.json()
      if (data.ok) {
        setCompletadas([...completadas, leccionActual.id])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setGuardando(false)
    }
  }

  function moduloCompletado(modulo: Modulo) {
    if (!modulo.lecciones || modulo.lecciones.length === 0) return false
    return modulo.lecciones.every(l => completadas.includes(l.id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* PLAYER */}
      <div className="lg:col-span-2">
        <VideoPlayer
          videoId={leccionActual.video_url}
          titulo={leccionActual.titulo}
        />

        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold">{leccionActual.titulo}</h2>
            <p className="text-slate-400 text-sm mt-1">
              Leccion {leccionActual.orden} · {leccionActual.duracion_minutos} min
            </p>
          </div>
          <button
            onClick={marcarCompletada}
            disabled={completadas.includes(leccionActual.id) || guardando}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
              completadas.includes(leccionActual.id)
                ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-default'
                : 'bg-yellow-500 text-black hover:bg-yellow-400'
            }`}
          >
            {completadas.includes(leccionActual.id)
              ? '✓ Completada'
              : guardando
              ? 'Guardando...'
              : 'Marcar como completada'}
          </button>
        </div>

        {/* PROGRESO */}
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Tu progreso en el curso</span>
            <span className="text-yellow-500 font-bold font-mono text-sm">{porcentaje}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-500"
              style={{ width: `${porcentaje}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {completadas.length} de {lecciones.length} lecciones completadas
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-bold">Contenido del curso</h3>
          </div>

          {modulos && modulos.length > 0 ? (
            <div>
              {modulos.map((modulo, mIndex) => {
                const estaCompleto = moduloCompletado(modulo)
                const tieneEval = modulo.evaluacion != null
                return (
                  <div key={modulo.id} className="border-b border-slate-800 last:border-0">

                    {/* HEADER MODULO */}
                    <div className="px-4 py-3 bg-slate-800/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          MODULO {mIndex + 1}
                        </span>
                        {estaCompleto && (
                          <span className="text-green-400 text-xs">✓</span>
                        )}
                      </div>
                      <div className="text-sm font-semibold mt-0.5">{modulo.titulo}</div>
                    </div>

                    {/* LECCIONES */}
                    {modulo.lecciones && modulo.lecciones
                      .sort((a, b) => a.orden - b.orden)
                      .map((leccion) => (
                      <div
                        key={leccion.id}
                        onClick={() => setLeccionActual(leccion)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          leccionActual.id === leccion.id
                            ? 'bg-yellow-500/10 border-l-2 border-yellow-500'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          completadas.includes(leccion.id)
                            ? 'bg-green-500/20 text-green-400'
                            : leccionActual.id === leccion.id
                            ? 'bg-yellow-500 text-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {completadas.includes(leccion.id) ? '✓' : leccion.orden}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium truncate ${
                            leccionActual.id === leccion.id ? 'text-yellow-500' : 'text-white'
                          }`}>
                            {leccion.titulo}
                          </div>
                          {leccion.duracion_minutos && (
                            <div className="text-xs text-slate-500">{leccion.duracion_minutos} min</div>
                          )}
                        </div>
                        {leccion.es_gratis && (
                          <span className="text-xs font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                            Gratis
                          </span>
                        )}
                      </div>
                    ))}

                    {/* BOTON EVALUACION */}
                    {tieneEval && (
                      <div className="px-4 py-3 bg-slate-800/30">
                        {estaCompleto ? (
                          <button
                            onClick={() => router.push(`/evaluacion/${modulo.evaluacion!.id}`)}
                            className="w-full bg-yellow-500 text-black font-bold py-2 rounded-xl hover:bg-yellow-400 transition-colors text-xs"
                          >
                            📝 Tomar evaluacion — {modulo.evaluacion!.titulo}
                          </button>
                        ) : (
                          <div className="w-full border border-slate-700 text-slate-500 font-semibold py-2 rounded-xl text-xs text-center">
                            🔒 Completa las lecciones para evaluar
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {lecciones
                .sort((a, b) => a.orden - b.orden)
                .map((leccion) => (
                <div
                  key={leccion.id}
                  onClick={() => setLeccionActual(leccion)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    leccionActual.id === leccion.id
                      ? 'bg-yellow-500/10 border-l-2 border-yellow-500'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    completadas.includes(leccion.id)
                      ? 'bg-green-500/20 text-green-400'
                      : leccionActual.id === leccion.id
                      ? 'bg-yellow-500 text-black'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {completadas.includes(leccion.id) ? '✓' : leccion.orden}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium truncate ${
                      leccionActual.id === leccion.id ? 'text-yellow-500' : 'text-white'
                    }`}>
                      {leccion.titulo}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}