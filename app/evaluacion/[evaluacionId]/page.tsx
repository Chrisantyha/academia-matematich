'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import TextoMath from '@/components/ui/TextoMath'
import Link from 'next/link'

interface Pregunta {
  id: string
  tipo: string
  pregunta: string
  opciones: string[] | null
  tolerancia: number
  orden: number
}

interface Evaluacion {
  id: string
  titulo: string
  curso_id: string
}

type RespuestaPar = { x: string; y: string }
type RespuestaRaices = { x1: string; x2: string }

export default function EvaluacionPage() {
  const params = useParams()
  const evaluacionId = params.evaluacionId as string

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [respuestas, setRespuestas] = useState<Record<string, string | RespuestaPar | RespuestaRaices>>({})
  const [loading, setLoading] = useState(true)
  const [intentoId, setIntentoId] = useState<string | null>(null)
  const [esDocenteAdmin, setEsDocenteAdmin] = useState(false)
  const [acceso, setAcceso] = useState<'verificando' | 'permitido' | 'denegado' | 'sin_intentos'>('verificando')
  const [mensajeAcceso, setMensajeAcceso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [resultado, setResultado] = useState<{ puntaje: number; aprobado: boolean; correctas: number; total: number; notaMinima: number } | null>(null)
  const [preguntaActual, setPreguntaActual] = useState(0)

  useEffect(() => {
    cargarEvaluacion()
  }, [])

  async function cargarEvaluacion() {
    setLoading(true)
    try {
      const response = await fetch('/api/evaluacion/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluacionId }),
      })
      const data = await response.json()

      if (!data.ok) {
        setEvaluacion(data.cursoId ? { id: evaluacionId, titulo: '', curso_id: data.cursoId } : null)
        setMensajeAcceso(data.error || '')
        setAcceso(data.motivo === 'sin_intentos' ? 'sin_intentos' : 'denegado')
        setLoading(false)
        return
      }

      setEvaluacion(data.evaluacion)
      setPreguntas(data.preguntas || [])
      setIntentoId(data.intentoId)
      setEsDocenteAdmin(!!data.esDocenteAdmin)
      setAcceso('permitido')
      setLoading(false)
    } catch (err) {
      setAcceso('denegado')
      setLoading(false)
    }
  }

  function responder(preguntaId: string, respuesta: string) {
    setRespuestas({ ...respuestas, [preguntaId]: respuesta })
  }

  function responderPar(preguntaId: string, eje: 'x' | 'y', valor: string) {
    const actual = (respuestas[preguntaId] as RespuestaPar | undefined) || { x: '', y: '' }
    setRespuestas({ ...respuestas, [preguntaId]: { ...actual, [eje]: valor } })
  }

  function responderRaices(preguntaId: string, cual: 'x1' | 'x2', valor: string) {
    const actual = (respuestas[preguntaId] as RespuestaRaices | undefined) || { x1: '', x2: '' }
    setRespuestas({ ...respuestas, [preguntaId]: { ...actual, [cual]: valor } })
  }

  async function enviarEvaluacion() {
    if (Object.keys(respuestas).length < preguntas.length) {
      alert('Debes responder todas las preguntas')
      return
    }

    setEnviando(true)
    setErrorEnvio('')

    try {
      const response = await fetch('/api/evaluacion/calificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentoId, respuestas }),
      })

      const data = await response.json()

      if (!data.ok) {
        setErrorEnvio(data.error || 'No se pudo calificar la evaluación.')
        setEnviando(false)
        return
      }

      setResultado({
        puntaje: data.puntaje,
        aprobado: data.aprobado,
        correctas: data.correctas,
        total: data.total,
        notaMinima: data.notaMinima,
      })
    } catch (err) {
      setErrorEnvio('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  function destinoCurso(cursoId: string | undefined) {
    if (!cursoId) return '/cursos'
    return esDocenteAdmin ? `/docente/curso/${cursoId}` : `/cursos/${cursoId}`
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Cargando evaluación...</div>
      </main>
    )
  }

  if (acceso === 'denegado') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-slate-400 mb-6">
            No tienes acceso a esta evaluación. Necesitas haber comprado el curso.
          </p>
          <Link
            href={evaluacion ? `/cursos/${evaluacion.curso_id}` : '/cursos'}
            className="text-yellow-500 font-semibold hover:text-yellow-400"
          >
            Ver el curso
          </Link>
        </div>
      </main>
    )
  }

  if (acceso === 'sin_intentos') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-slate-400 mb-6">{mensajeAcceso}</p>
          <Link
            href={evaluacion ? `/cursos/${evaluacion.curso_id}` : '/cursos'}
            className="text-yellow-500 font-semibold hover:text-yellow-400"
          >
            Volver al curso
          </Link>
        </div>
      </main>
    )
  }

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
              ? 'Excelente trabajo. Puedes continuar al siguiente módulo.'
              : `Necesitas ${resultado.notaMinima}% para aprobar. Intenta de nuevo.`}
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
              Nota mínima: {resultado.notaMinima}%
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            {resultado.aprobado ? (
              <Link
                href={destinoCurso(evaluacion?.curso_id)}
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
                  cargarEvaluacion()
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

  if (!pregunta) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <p className="text-slate-400">Esta evaluación no tiene preguntas todavía.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={destinoCurso(evaluacion?.curso_id)}
            className="text-slate-400 text-sm hover:text-white transition-colors"
          >
            ← Volver al curso
          </Link>
          <span className="text-slate-400 text-sm">{evaluacion?.titulo}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-12">

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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-6">
          <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-4">
            {pregunta.tipo === 'opcion_multiple' && 'Opción múltiple'}
            {pregunta.tipo === 'verdadero_falso' && 'Verdadero o Falso'}
            {pregunta.tipo === 'numerica' && 'Respuesta numérica'}
            {pregunta.tipo === 'par_numerico' && 'Sistema de ecuaciones'}
            {pregunta.tipo === 'texto_algebraico' && 'Factorización'}
            {pregunta.tipo === 'radical' && 'Respuesta en forma radical'}
            {pregunta.tipo === 'raices_cuadratica' && 'Ecuación cuadrática'}
          </div>

          <div className="text-lg font-semibold mb-6 leading-relaxed whitespace-pre-line">
            <TextoMath texto={pregunta.pregunta} />
          </div>

          {pregunta.tipo === 'opcion_multiple' && (
            <div className="space-y-3">
              {(pregunta.opciones || []).map((opcion, index) => {
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

          {pregunta.tipo === 'numerica' && (
            <div>
              <input
                type="text"
                value={(respuestas[pregunta.id] as string) || ''}
                onChange={(e) => responder(pregunta.id, e.target.value)}
                placeholder="Escribe tu respuesta (ej: 0.4 o 2/5)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
              />
              {pregunta.tolerancia > 0 && (
                <p className="text-slate-500 text-xs mt-2">
                  Tolerancia: ± {pregunta.tolerancia}
                </p>
              )}
            </div>
          )}

          {pregunta.tipo === 'par_numerico' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">x =</label>
                <input
                  type="text"
                  value={(respuestas[pregunta.id] as RespuestaPar | undefined)?.x || ''}
                  onChange={(e) => responderPar(pregunta.id, 'x', e.target.value)}
                  placeholder="Ej: 3 o 6/2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">y =</label>
                <input
                  type="text"
                  value={(respuestas[pregunta.id] as RespuestaPar | undefined)?.y || ''}
                  onChange={(e) => responderPar(pregunta.id, 'y', e.target.value)}
                  placeholder="Ej: -2 o 4/2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
                />
              </div>
            </div>
          )}

          {pregunta.tipo === 'texto_algebraico' && (
            <input
              type="text"
              value={(respuestas[pregunta.id] as string) || ''}
              onChange={(e) => responder(pregunta.id, e.target.value)}
              placeholder="Ej: (x+3)(x+2)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
            />
          )}

          {pregunta.tipo === 'radical' && (
            <input
              type="text"
              value={(respuestas[pregunta.id] as string) || ''}
              onChange={(e) => responder(pregunta.id, e.target.value)}
              placeholder="Ej: 2√3, raiz(12), sqrt(12)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
            />
          )}

          {pregunta.tipo === 'raices_cuadratica' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Solución 1</label>
                <input
                  type="text"
                  value={(respuestas[pregunta.id] as RespuestaRaices | undefined)?.x1 || ''}
                  onChange={(e) => responderRaices(pregunta.id, 'x1', e.target.value)}
                  placeholder="Ej: 3 o 6/2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Solución 2</label>
                <input
                  type="text"
                  value={(respuestas[pregunta.id] as RespuestaRaices | undefined)?.x2 || ''}
                  onChange={(e) => responderRaices(pregunta.id, 'x2', e.target.value)}
                  placeholder="Ej: -2 o 4/2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-lg"
                />
              </div>
            </div>
          )}
        </div>

        {errorEnvio && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
            {errorEnvio}
          </div>
        )}

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
              {enviando ? 'Enviando...' : 'Enviar evaluación'}
            </button>
          )}
        </div>

      </div>
    </main>
  )
}
