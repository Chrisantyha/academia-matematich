'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import VideoUpload from '@/components/curso/VideoUpload'
import { useParams } from 'next/navigation'

const NIVELES = ['bachillerato', 'universitario', 'posgrado']

interface Modulo {
  id: string
  titulo: string
  orden: number
  lecciones: Leccion[]
}

interface Leccion {
  id: string
  titulo: string
  video_url: string
  duracion_minutos: number
  orden: number
  es_gratis: boolean
}

export default function GestionarCursoPage() {
  const params = useParams()
  const cursoId = params.id as string
  const supabase = createClient()

  const [curso, setCurso] = useState<any>(null)
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoModulo, setNuevoModulo] = useState('')
  const [agregandoModulo, setAgregandoModulo] = useState(false)
  const [moduloActivo, setModuloActivo] = useState<string | null>(null)
  const [borrandoId, setBorrandoId] = useState<string | null>(null)
  const [editandoCurso, setEditandoCurso] = useState(false)
  const [guardandoCurso, setGuardandoCurso] = useState(false)
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([])
  const [formCurso, setFormCurso] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    categoria: '',
    nivel: NIVELES[0],
  })

  useEffect(() => {
    cargarDatos(true)
  }, [])

  async function cargarDatos(esCargaInicial = false) {
    if (esCargaInicial) setLoading(true)

    try {
      const { data: cursoData } = await supabase
        .from('cursos')
        .select('*')
        .eq('id', cursoId)
        .single()

      setCurso(cursoData)

      const { data: modulosData } = await supabase
        .from('modulos')
        .select(`
          *,
          lecciones!lecciones_modulo_id_fkey (*)
        `)
        .eq('curso_id', cursoId)
        .order('orden', { ascending: true })

      setModulos(modulosData || [])

      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('nombre')
        .order('nombre', { ascending: true })

      setCategoriasDisponibles((categoriasData || []).map((c) => c.nombre))
    } catch (err) {
      console.error('Error al cargar datos del curso:', err)
    } finally {
      if (esCargaInicial) setLoading(false)
    }
  }

  async function agregarModulo() {
    if (!nuevoModulo.trim()) return
    setAgregandoModulo(true)

    const { data } = await supabase
      .from('modulos')
      .insert({
        curso_id: cursoId,
        titulo: nuevoModulo,
        orden: modulos.length + 1,
      })
      .select()
      .single()

    if (data) {
      setModulos([...modulos, { ...data, lecciones: [] }])
      setNuevoModulo('')
    }
    setAgregandoModulo(false)
  }

  async function borrarLeccion(leccion: Leccion) {
    const confirmado = window.confirm(
      `¿Eliminar la lección "${leccion.titulo}"? Esto también eliminará su video. Esta acción no se puede deshacer.`
    )
    if (!confirmado) return

    setBorrandoId(leccion.id)
    try {
      const response = await fetch(`/api/lecciones/${leccion.id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al eliminar la leccion')
        return
      }

      cargarDatos()
    } catch (err) {
      alert('Error de conexion al eliminar la leccion')
    } finally {
      setBorrandoId(null)
    }
  }

  async function borrarModulo(modulo: Modulo, e: React.MouseEvent) {
    e.stopPropagation()

    const totalLecciones = modulo.lecciones?.length || 0
    const mensaje = totalLecciones > 0
      ? `¿Eliminar el módulo "${modulo.titulo}"? Esto eliminará ${totalLecciones} ${totalLecciones === 1 ? 'lección' : 'lecciones'} y sus videos. Esta acción no se puede deshacer.`
      : `¿Eliminar el módulo "${modulo.titulo}"? Esta acción no se puede deshacer.`

    const confirmado = window.confirm(mensaje)
    if (!confirmado) return

    setBorrandoId(modulo.id)
    try {
      const response = await fetch(`/api/modulos/${modulo.id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!data.ok) {
        // TODO(debug): quitar "data.detalle" antes de lanzar a produccion.
        alert(
          data.detalle
            ? `${data.error}\n\n${JSON.stringify(data.detalle, null, 2)}`
            : (data.error || 'Error al eliminar el modulo')
        )
        return
      }

      if (moduloActivo === modulo.id) setModuloActivo(null)
      cargarDatos()
    } catch (err) {
      alert('Error de conexion al eliminar el modulo')
    } finally {
      setBorrandoId(null)
    }
  }

  async function renombrarModulo(modulo: Modulo, e: React.MouseEvent) {
    e.stopPropagation()

    const nuevoTitulo = window.prompt('Nuevo título del módulo:', modulo.titulo)
    if (!nuevoTitulo || !nuevoTitulo.trim() || nuevoTitulo.trim() === modulo.titulo) return

    try {
      const response = await fetch(`/api/modulos/${modulo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: nuevoTitulo.trim() }),
      })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al renombrar el modulo')
        return
      }

      cargarDatos()
    } catch (err) {
      alert('Error de conexion al renombrar el modulo')
    }
  }

  async function renombrarLeccion(leccion: Leccion) {
    const nuevoTitulo = window.prompt('Nuevo título de la lección:', leccion.titulo)
    if (!nuevoTitulo || !nuevoTitulo.trim() || nuevoTitulo.trim() === leccion.titulo) return

    try {
      const response = await fetch(`/api/lecciones/${leccion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: nuevoTitulo.trim() }),
      })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al renombrar la leccion')
        return
      }

      cargarDatos()
    } catch (err) {
      alert('Error de conexion al renombrar la leccion')
    }
  }

  function abrirEdicionCurso() {
    setFormCurso({
      titulo: curso?.titulo || '',
      descripcion: curso?.descripcion || '',
      precio: String(curso?.precio ?? ''),
      categoria: curso?.categoria || categoriasDisponibles[0] || '',
      nivel: curso?.nivel || NIVELES[0],
    })
    setEditandoCurso(true)
  }

  function handleFormCursoChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormCurso({ ...formCurso, [e.target.name]: e.target.value })
  }

  async function guardarCurso() {
    setGuardandoCurso(true)
    try {
      const response = await fetch(`/api/cursos/${cursoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formCurso.titulo,
          descripcion: formCurso.descripcion,
          precio: parseFloat(formCurso.precio),
          categoria: formCurso.categoria,
          nivel: formCurso.nivel,
        }),
      })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al actualizar el curso')
        return
      }

      setCurso(data.curso)
      setEditandoCurso(false)
    } catch (err) {
      alert('Error de conexion al actualizar el curso')
    } finally {
      setGuardandoCurso(false)
    }
  }

  async function publicarCurso() {
    await supabase
      .from('cursos')
      .update({ estado: 'en_revision' })
      .eq('id', cursoId)

    setCurso({ ...curso, estado: 'en_revision' })
    alert('Curso enviado a revision. El admin lo aprobara pronto.')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* TOP BAR */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <Link href="/docente" className="text-slate-400 text-sm hover:text-white transition-colors">
          ← Volver al panel
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">

        {/* HEADER CURSO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
              {curso?.categoria}
            </div>
            <h1 className="text-2xl font-bold mb-1">{curso?.titulo}</h1>
            <p className="text-slate-400 text-sm">{curso?.descripcion}</p>
            <div className="flex gap-3 mt-3">
              <span className="text-yellow-500 font-bold">${curso?.precio}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                curso?.estado === 'publicado'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : curso?.estado === 'en_revision'
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {curso?.estado === 'publicado' ? 'Publicado' : curso?.estado === 'en_revision' ? 'En revisión' : 'Borrador'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={abrirEdicionCurso}
              className="border border-slate-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm"
            >
              ✏️ Editar curso
            </button>
            {curso?.estado === 'borrador' && (
              <button
                onClick={publicarCurso}
                className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors text-sm"
              >
                Enviar a revision
              </button>
            )}
          </div>
        </div>

        {/* EDITAR CURSO */}
        {editandoCurso && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-bold mb-4">Editar curso</h3>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Titulo</label>
              <input
                type="text"
                name="titulo"
                value={formCurso.titulo}
                onChange={handleFormCursoChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Descripcion</label>
              <textarea
                name="descripcion"
                value={formCurso.descripcion}
                onChange={handleFormCursoChange}
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Categoria</label>
                <select
                  name="categoria"
                  value={formCurso.categoria}
                  onChange={handleFormCursoChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                >
                  {categoriasDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Nivel</label>
                <select
                  name="nivel"
                  value={formCurso.nivel}
                  onChange={handleFormCursoChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                >
                  {NIVELES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Precio (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  name="precio"
                  value={formCurso.precio}
                  onChange={handleFormCursoChange}
                  min="1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={guardarCurso}
                disabled={guardandoCurso}
                className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 text-sm"
              >
                {guardandoCurso ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                onClick={() => setEditandoCurso(false)}
                className="border border-slate-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* MODULOS */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">Modulos del curso</h2>

          {modulos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center mb-4">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-400 text-sm">No hay modulos aun. Agrega el primero.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {modulos.map((modulo, index) => (
                <div key={modulo.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => setModuloActivo(moduloActivo === modulo.id ? null : modulo.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-semibold">{modulo.titulo}</span>
                      <span className="text-slate-500 text-xs">
                        {modulo.lecciones?.length || 0} lecciones
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/docente/evaluacion/${modulo.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Crear evaluación"
                        className="text-slate-500 hover:text-yellow-400 transition-colors text-sm"
                      >
                        📝
                      </Link>
                      <button
                        onClick={(e) => renombrarModulo(modulo, e)}
                        title="Renombrar modulo"
                        className="text-slate-500 hover:text-yellow-400 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => borrarModulo(modulo, e)}
                        disabled={borrandoId === modulo.id}
                        title="Eliminar modulo"
                        className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        🗑️
                      </button>
                      <span className="text-slate-400">
                        {moduloActivo === modulo.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {moduloActivo === modulo.id && (
                    <div className="border-t border-slate-800 p-6">
                      {modulo.lecciones && modulo.lecciones.length > 0 && (
                        <div className="mb-6">
                          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                            Lecciones
                          </div>
                          {modulo.lecciones
                            .sort((a, b) => a.orden - b.orden)
                            .map((leccion) => (
                            <div key={leccion.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                              <span className="text-slate-500 text-xs font-mono w-6">{leccion.orden}</span>
                              <span className="text-sm flex-1">{leccion.titulo}</span>
                              {leccion.es_gratis && (
                                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Gratis</span>
                              )}
                              <button
                                onClick={() => renombrarLeccion(leccion)}
                                title="Renombrar leccion"
                                className="text-slate-500 hover:text-yellow-400 transition-colors text-sm"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => borrarLeccion(leccion)}
                                disabled={borrandoId === leccion.id}
                                title="Eliminar leccion"
                                className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40 text-sm"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <VideoUpload
                        cursoId={cursoId}
                        moduloId={modulo.id}
                        orden={(modulo.lecciones?.length || 0) + 1}
                        onSuccess={() => cargarDatos()}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AGREGAR MODULO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold mb-4">Agregar modulo</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={nuevoModulo}
                onChange={(e) => setNuevoModulo(e.target.value)}
                placeholder="Ej: Modulo 1 — Limites"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && agregarModulo()}
              />
              <button
                onClick={agregarModulo}
                disabled={agregandoModulo}
                className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {agregandoModulo ? 'Agregando...' : '+ Agregar'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}