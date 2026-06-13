'use client'

import { useState } from 'react'
import VideoPlayer from './VideoPlayer'

interface Leccion {
  id: string
  titulo: string
  video_url: string
  duracion_minutos: number
  es_gratis: boolean
  orden: number
}

interface LeccionPlayerProps {
  lecciones: Leccion[]
  cursoId: string
  progresoInicial: string[]
}

export default function LeccionPlayer({ lecciones, cursoId, progresoInicial }: LeccionPlayerProps) {
  const [leccionActual, setLeccionActual] = useState(lecciones[0])
  const [completadas, setCompletadas] = useState<string[]>(progresoInicial)
  const [guardando, setGuardando] = useState(false)

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

  const porcentaje = Math.round((completadas.length / lecciones.length) * 100)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* PLAYER */}
      <div className="lg:col-span-2">
        <VideoPlayer
          videoId={leccionActual.video_url}
          titulo={leccionActual.titulo}
        />

        <div className="mt-4 flex items-center justify-between">
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

        {/* PROGRESO GENERAL */}
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Tu progreso</span>
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

      {/* LISTA DE LECCIONES */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-bold">Contenido del curso</h3>
          </div>
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  completadas.includes(leccion.id)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : leccionActual.id === leccion.id
                    ? 'bg-yellow-500 text-black'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {completadas.includes(leccion.id) ? '✓' : leccion.orden}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${
                    leccionActual.id === leccion.id ? 'text-yellow-500' : 'text-white'
                  }`}>
                    {leccion.titulo}
                  </div>
                  {leccion.duracion_minutos && (
                    <div className="text-xs text-slate-500">{leccion.duracion_minutos} min</div>
                  )}
                </div>
                {leccion.es_gratis && (
                  <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded flex-shrink-0">
                    Gratis
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}