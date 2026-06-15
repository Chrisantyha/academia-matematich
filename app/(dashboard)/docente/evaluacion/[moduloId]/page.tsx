'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import TextoMath from '@/components/ui/TextoMath'

interface Pregunta {
  tipo: 'opcion_multiple' | 'verdadero_falso' | 'numerica'
  pregunta: string
  opciones: string[]
  respuesta_correcta: string
  tolerancia: number
  orden: number
}

export default function CrearEvaluacionPage() {
  const params = useParams()
  const router = useRouter()
  const moduloId = params.moduloId as string
  const supabase = createClient()

  const [titulo, setTitulo] = useState('')
  const [notaMinima, setNotaMinima] = useState(70)
  const [intentos, setIntentos] = useState(3)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const preguntaVacia: Pregunta = {
    tipo: 'opcion_multiple',
    pregunta: '',
    opciones: ['', '', '', ''],
    respuesta_correcta: '',
    tolerancia: 0,
    orden: preguntas.length + 1,
  }

  function agregarPregunta() {
    setPreguntas([...preguntas, { ...preguntaVacia, orden: preguntas.length + 1 }])
  }

  function actualizarPregunta(index: number, campo: string, valor: any) {
    const nuevas = [...preguntas]
    nuevas[index] = { ...nuevas[index], [campo]: valor }
    if (campo === 'tipo') {
      if (valor === 'verdadero_falso') {
        nuevas[index].opciones = ['Verdadero', 'Falso']
        nuevas[index].respuesta_correcta = ''
      } else if (valor === 'opcion_multiple') {
        nuevas[index].opciones = ['', '', '', '']
        nuevas[index].respuesta_correcta = ''
      } else if (valor === 'numerica') {
        nuevas[index].opciones = []
        nuevas[index].respuesta_correcta = ''
      }
    }
    setPreguntas(nuevas)
  }

  function actualizarOpcion(preguntaIndex: number, opcionIndex: number, valor: string) {
    const nuevas = [...preguntas]
    nuevas[preguntaIndex].opciones[opcionIndex] = valor
    setPreguntas(nuevas)
  }

  function eliminarPregunta(index: number) {
    setPreguntas(preguntas.filter((_, i) => i !== index))
  }

  async function guardarEvaluacion() {
    if (!titulo) {
      setError('El titulo es obligatorio')
      return
    }
    if (preguntas.length === 0) {
      setError('Agrega al menos una pregunta')
      return
    }
    for (const p of preguntas) {
      if (!p.pregunta.trim()) {
        setError('Todas las preguntas deben tener texto')
        return
      }
      if (!p.respuesta_correcta.toString().trim()) {
        setError('Todas las preguntas deben tener respuesta correcta')
        return
      }
    }

    setGuardando(true)
    setError('')

    const { data: moduloData } = await supabase
      .from('modulos')
      .select('curso_id')
      .eq('id', moduloId)
      .single()

    const { data: evalData, error: evalError } = await supabase
      .from('evaluaciones')
      .insert({
        modulo_id: moduloId,
        curso_id: moduloData?.curso_id,
        titulo,
        nota_minima: notaMinima,
        intentos_permitidos: intentos,
      })
      .select()
      .single()

    if (evalError) {
      setError('Error al guardar evaluacion')
      setGuardando(false)
      return
    }

    for (const p of preguntas) {
      await supabase.from('preguntas').insert({
        evaluacion_id: evalData.id,
        tipo: p.tipo,
        pregunta: p.pregunta,
        opciones: p.tipo !== 'numerica' ? p.opciones : null,
        respuesta_correcta: p.respuesta_correcta,
        tolerancia: p.tolerancia,
        orden: p.orden,
      })
    }

    alert('Evaluacion guardada correctamente')
      router.push(`/docente/curso/${moduloData?.curso_id}`)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <button
          onClick={() => router.back()}
          className="text-slate-400 text-sm hover:text-white transition-colors"
        >
          ← Volver
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-12">

        <div className="mb-8">
          <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
            Crear evaluacion
          </div>
          <h1 className="text-3xl font-bold">Nueva evaluacion del modulo</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Puedes usar LaTeX en las preguntas. Ejemplo: $x^2$ o $$\frac{"{x}"}{"{2}"}$$
          </p>
        </div>

        {/* CONFIG GENERAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-bold mb-4">Configuracion general</h2>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Titulo de la evaluacion
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Evaluacion Modulo 1 — Limites"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Nota minima para aprobar (%)
              </label>
              <input
                type="number"
                value={notaMinima}
                onChange={(e) => setNotaMinima(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Intentos permitidos
              </label>
              <input
                type="number"
                value={intentos}
                onChange={(e) => setIntentos(parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* PREGUNTAS */}
        <div className="space-y-4 mb-6">
          {preguntas.map((p, index) => (
            <div key={index} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-yellow-500">
                  Pregunta {index + 1}
                </span>
                <button
                  onClick={() => eliminarPregunta(index)}
                  className="text-red-400 text-xs hover:text-red-300 transition-colors"
                >
                  Eliminar
                </button>
              </div>

              {/* TIPO */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Tipo de pregunta
                </label>
                <select
                  value={p.tipo}
                  onChange={(e) => actualizarPregunta(index, 'tipo', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                >
                  <option value="opcion_multiple">Opcion multiple</option>
                  <option value="verdadero_falso">Verdadero / Falso</option>
                  <option value="numerica">Respuesta numerica</option>
                </select>
              </div>

              {/* PREGUNTA */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Pregunta (puedes usar LaTeX con $formula$)
                </label>
                <textarea
                  value={p.pregunta}
                  onChange={(e) => actualizarPregunta(index, 'pregunta', e.target.value)}
                  placeholder="Ej: ¿Cuál es la derivada de $x^2$?"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors resize-none"
                />
                {p.pregunta && (
                  <div className="mt-2 bg-slate-800 rounded-lg px-4 py-2 text-sm">
                    <span className="text-slate-500 text-xs">Vista previa: </span>
                    <TextoMath texto={p.pregunta} />
                  </div>
                )}
              </div>

              {/* OPCIONES MULTIPLE */}
              {p.tipo === 'opcion_multiple' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Opciones
                  </label>
                  {p.opciones.map((op, opIndex) => (
                    <div key={opIndex} className="flex items-center gap-3 mb-2">
                      <span className="text-slate-400 text-sm w-6 font-mono">
                        {String.fromCharCode(65 + opIndex)})
                      </span>
                      <input
                        type="text"
                        value={op}
                        onChange={(e) => actualizarOpcion(index, opIndex, e.target.value)}
                        placeholder={`Opcion ${String.fromCharCode(65 + opIndex)}`}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-sm"
                      />
                    </div>
                  ))}
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Respuesta correcta
                    </label>
                    <select
                      value={p.respuesta_correcta}
                      onChange={(e) => actualizarPregunta(index, 'respuesta_correcta', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                    >
                      <option value="">Selecciona la correcta</option>
                      {p.opciones.map((op, opIndex) => (
                        <option key={opIndex} value={String.fromCharCode(65 + opIndex)}>
                          {String.fromCharCode(65 + opIndex)}) {op}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* VERDADERO FALSO */}
              {p.tipo === 'verdadero_falso' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Respuesta correcta
                  </label>
                  <select
                    value={p.respuesta_correcta}
                    onChange={(e) => actualizarPregunta(index, 'respuesta_correcta', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="">Selecciona</option>
                    <option value="Verdadero">Verdadero</option>
                    <option value="Falso">Falso</option>
                  </select>
                </div>
              )}

              {/* NUMERICA */}
              {p.tipo === 'numerica' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Respuesta correcta
                    </label>
                    <input
                      type="number"
                      value={p.respuesta_correcta}
                      onChange={(e) => actualizarPregunta(index, 'respuesta_correcta', e.target.value)}
                      placeholder="Ej: 12"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Tolerancia (±)
                    </label>
                    <input
                      type="number"
                      value={p.tolerancia}
                      onChange={(e) => actualizarPregunta(index, 'tolerancia', parseFloat(e.target.value))}
                      placeholder="Ej: 0.1"
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                    />
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>

        {/* AGREGAR PREGUNTA */}
        <button
          onClick={agregarPregunta}
          className="w-full border-2 border-dashed border-slate-700 rounded-2xl py-4 text-slate-400 hover:border-yellow-500/50 hover:text-yellow-500 transition-colors mb-6 font-semibold"
        >
          + Agregar pregunta
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={guardarEvaluacion}
            disabled={guardando}
            className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar evaluacion'}
          </button>
          <button
            onClick={() => router.back()}
            className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </main>
  )
}