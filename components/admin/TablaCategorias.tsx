'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Categoria = {
  id: string
  nombre: string
  created_at: string
}

export default function TablaCategorias({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creando, setCreando] = useState(false)
  const [borrandoId, setBorrandoId] = useState<string | null>(null)

  async function crearCategoria() {
    if (!nuevaCategoria.trim()) return
    setCreando(true)

    try {
      const response = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaCategoria.trim() }),
      })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al crear la categoría')
        return
      }

      setNuevaCategoria('')
      router.refresh()
    } catch {
      alert('Error de conexión al crear la categoría')
    } finally {
      setCreando(false)
    }
  }

  async function borrarCategoria(categoria: Categoria) {
    const confirmado = window.confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)
    if (!confirmado) return

    setBorrandoId(categoria.id)
    try {
      const response = await fetch(`/api/categorias/${categoria.id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al eliminar la categoría')
        return
      }

      router.refresh()
    } catch {
      alert('Error de conexión al eliminar la categoría')
    } finally {
      setBorrandoId(null)
    }
  }

  return (
    <div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold">Categorías ({categorias.length})</h3>
        </div>

        {categorias.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay categorías creadas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Nombre</th>
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Creada</th>
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold">{c.nombre}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(c.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => borrarCategoria(c)}
                      disabled={borrandoId === c.id}
                      className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {borrandoId === c.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold mb-4">Agregar categoría</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Ej: Trigonometría"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && crearCategoria()}
          />
          <button
            onClick={crearCategoria}
            disabled={creando}
            className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {creando ? 'Agregando...' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}
