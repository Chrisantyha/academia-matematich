'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const niveles = ['kids', 'bachillerato', 'universitario', 'posgrado']

// "kids" usa categorias de nivel 'kids'; el resto usa las de nivel 'general'
function nivelCategoria(nivel: string) {
  return nivel === 'kids' ? 'kids' : 'general'
}

export default function CrearCursoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [todasCategorias, setTodasCategorias] = useState<{ nombre: string; nivel: string }[]>([])
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio: '9',
    categoria: '',
    nivel: 'universitario',
  })

  useEffect(() => {
    async function cargarCategorias() {
      const supabase = createClient()
      const { data } = await supabase
        .from('categorias')
        .select('nombre, nivel')
        .order('nombre', { ascending: true })

      setTodasCategorias(data || [])
    }
    cargarCategorias()
  }, [])

  const categorias = todasCategorias
    .filter((c) => c.nivel === nivelCategoria(form.nivel))
    .map((c) => c.nombre)

  // Si cambia el nivel del curso y la categoria seleccionada ya no aplica, resetea
  useEffect(() => {
    if (categorias.length > 0 && !categorias.includes(form.categoria)) {
      setForm((f) => ({ ...f, categoria: categorias[0] }))
    }
  }, [form.nivel, todasCategorias])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit() {
    if (!form.titulo || !form.descripcion) {
      setError('El título y descripción son obligatorios')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('No autorizado')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('cursos')
      .insert({
        titulo: form.titulo,
        descripcion: form.descripcion,
        precio: parseFloat(form.precio),
        categoria: form.categoria,
        nivel: form.nivel,
        docente_id: user.id,
        estado: 'borrador',
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      setError('Error al crear el curso. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push(`/docente/curso/${data.id}`)
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

      <div className="max-w-2xl mx-auto px-8 py-12">

        <div className="mb-8">
          <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
            Panel Docente
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Crear nuevo curso</h1>
          <p className="text-slate-400 mt-2">Completa la información básica de tu curso.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

          {/* TITULO */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Título del curso *
            </label>
            <input
              type="text"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              placeholder="Ej: Cálculo Diferencial desde cero"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          {/* DESCRIPCION */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Descripción *
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Describe de qué trata el curso, qué aprenderá el alumno..."
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors resize-none"
            />
          </div>

          {/* NIVEL Y CATEGORIA */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Nivel
              </label>
              <select
                name="nivel"
                value={form.nivel}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              >
                {niveles.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Categoría
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* PRECIO */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Precio (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                name="precio"
                value={form.precio}
                onChange={handleChange}
                min="1"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <p className="text-slate-500 text-xs mt-1">Precio mínimo recomendado: $9</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando curso...' : 'Crear curso'}
            </button>
            <Link
              href="/docente"
              className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </Link>
          </div>

        </div>
      </div>
    </main>
  )
}