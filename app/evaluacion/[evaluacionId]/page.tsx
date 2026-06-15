'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TextoMath from '@/components/ui/TextoMath'
import Link from 'next/link'

interface Pregunta {
  id: string
  tipo: string
  pregunta: string
  opciones: string[]
  respuesta_correcta: string
  tolerancia: number
  orden: number
}

interface Evaluacion {
  id: string
  titulo: string
  nota_minima: number
  intentos_permitidos: number
  curso_id: string
}

export default function EvaluacionPage() {
  const params = useParams()
  const router = useRouter()
  const evaluacionId = params.evaluacionId as string
  const supabase = createClient()

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ puntaje: number; aprobado: boolean; correctas: number; total: number } | null>(null)
  const [preguntaActual, setPreguntaActual] = useState(0)

  useEffect(() => {
    cargarEvaluacion()
  }, [])

  async function cargarEvaluacion() {
    const { data: evalData } = await supabase
      .from('evaluaciones')
      .select('*')
      .eq('id', evaluacionId)
      .single()

    const { data: pregData } = await supabase
      .from('preguntas')
      .select('*')
      .eq('evaluacion_id', evaluacionId)
      .order('orden', { ascending: true })

    setEvaluacion(evalData)
    setPreguntas(pregData || [])
    setLoading(false)
  }

  function responder(preguntaId: string, respuesta: string) {
    setRespuestas({ ...respuestas, [preguntaId]: respuesta })
  }

  async function enviarEvaluacion() {
    if (Object.keys(respuestas).length < preguntas.length) {
      alert('Debes responder todas las preguntas')
      return
    }

    setEnviando(true)

    // Calificar
    let correctas = 0
    for (const p of preguntas) {
      const respuesta = respuestas[p.id]
      if (p.tipo === 'numerica') {
        const respNum = parseFloat(respuesta)
        const correctaNum = parseFloat(p.respuesta_correcta)
        if (Math.abs(respNum - correctaNum) <= p.tolerancia) {
          correctas++
        }
      } else {
        if (respuesta === p.respuesta_correcta) {
          correctas++
        }
      }
    }

    const puntaje = Math.round((correctas / preguntas.length) * 100)
    const aprobado = puntaje >= (evaluacion?.nota_minima || 70)

    // Guardar resultado
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('resultados_evaluacion').insert({
      alumno_id: user?.id,
      evaluacion_id: evaluacionId,
      respuestas: respuestas,
      puntaje,
      aprobado,
    })

    setResultado({ puntaje, aprobado, correctas, total: preguntas.length })
    setEnviando(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Cargando evaluacion...</div>
      </main>
    )
  }

  // RESULTADO
  if (resultado) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">
            {resultado.aprobado ? '🎉' : '😔'}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {resultado.aprobado ? '¡Aprobaste!' : 'No aprobaste'}
          </h1>
          <p className="text-slate-400 mb-8">
            {resultado.aprobado
              ? 'Excelente trabajo. Puedes continuar al siguiente modulo.'
              : `Necesitas ${evaluacion?.nota_minima}% para aprobar. Intenta de nuevo.`}
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8">
            <div className={`text-6xl font-bold mb-2 ${resultado.aprobado ? 'text-green-400' : 'text-red-400'}`}>
              {resultado.puntaje}%
            </div>
            <div className="text-slate-400 text-sm">
              {resultado.correctas} de {resultado.total} preguntas correctas
            </div>

            <div className="mt-4 h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${resultado.aprobado ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ width: `${resultado.puntaje}%` }}
              ></div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Nota minima: {evaluacion?.nota_minima}%
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            {resultado.aprobado ? (
              <Link
                href={`/cursos/${evaluacion?.curso_id}`}
                className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Continuar curso
              </Link>
            ) : (
              <button
                onClick={() => {
                  setResultado(null)
                  setRespuestas({})
                  setPreguntaActual(0)
                }}
                className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Intentar de nuevo
              </button>
            )}
          </div>
        </div>
      </main>
    )
  }

  const pregunta = preguntas[preguntaActual]

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <span className="text-slate-400 text-sm">{evaluacion?.titulo}</span>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-12">

        {/* PROGRESO */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Pregunta {preguntaActual + 1} de {preguntas.length}</span>
            <span>{Math.round(((preguntaActual) / preguntas.length) * 100)}% completado</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-300"
              style={{ width: `${((preguntaActual) / preguntas.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* PREGUNTA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-6">
          <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-4">
            {pregunta.tipo === 'opcion_multiple' && 'Opcion multiple'}
            {pregunta.tipo === 'verdadero_falso' && 'Verdadero o Falso'}
            {pregunta.tipo === 'numerica' && 'Respuesta numerica'}
          </div>

          <div className="text-lg font-semibold mb-6 leading-relaxed">
            <TextoMath texto={pregunta.pregunta} />
          </div>

          {/* OPCIONES MULTIPLE */}
          {pregunta.tipo === 'opcion_multiple' && (
            <div className="space-y-3">
              {pregunta.opciones.map((opcion, index) => {
                const letra = String.fromCharCode(65 + index)
                const seleccionada = respuestas[pregunta.id] === letra
                return (
                  <button
                    key={index}
                    onClick={() => responder(pregunta.id, letra)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                      seleccionada
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-white'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      seleccionada ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {letra}
                    </span>
                    <TextoMath texto={opcion} />
                  </button>
                )
              })}
            </div>
          )}

          {/* VERDADERO FALSO */}
          {pregunta.tipo === 'verdadero_falso' && (
            <div className="grid grid-cols-2 gap-4">
              {['Verdadero', 'Falso'].map((opcion) => {
                const seleccionada = respuestas[pregunta.id] === opcion
                return (
                  <button
                    key={opcion}
                    onClick={() => responder(pregunta.id, opcion)}
                    className={`py-4 rounded-xl border font-bold transition-all ${
                      seleccionada
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-white'
                    }`}
                  >
                    {opcion === 'Verdadero' ? '✓ Verdadero' : '✗ Falso'}
                  </button>
                )
              })}
            </div>
          )}

          {/* NUMERICA */}
          {pregunta.tipo === 'numerica' && (
            <div>
              <input
                type="number"
                value={respuestas[pregunta.id] || ''}
                onChange={(e) => responder(pregunta.id, e.target.value)}
                placeholder="Escribe tu respuesta numerica"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
                step="any"
              />
              {pregunta.tolerancia > 0 && (
                <p className="text-slate-500 text-xs mt-2">
                  Tolerancia: ± {pregunta.tolerancia}
                </p>
              )}
            </div>
          )}
        </div>

        {/* NAVEGACION */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPreguntaActual(Math.max(0, preguntaActual - 1))}
            disabled={preguntaActual === 0}
            className="border border-slate-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-30"
          >
            ← Anterior
          </button>

          <div className="flex gap-2">
            {preguntas.map((_, index) => (
              <button
                key={index}
                onClick={() => setPreguntaActual(index)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                  index === preguntaActual
                    ? 'bg-yellow-500 text-black'
                    : respuestas[preguntas[index].id]
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {preguntaActual < preguntas.length - 1 ? (
            <button
              onClick={() => setPreguntaActual(preguntaActual + 1)}
              className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={enviarEvaluacion}
              disabled={enviando}
              className="bg-green-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Enviar evaluacion'}
            </button>
          )}
        </div>

      </div>
    </main>
  )
}