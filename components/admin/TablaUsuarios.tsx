'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Usuario = {
  id: string
  nombre: string | null
  email: string | null
  rol: string
  created_at: string
  totalCursos: number
}

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  docente: 'Docente',
  alumno: 'Alumno',
}

export default function TablaUsuarios({
  usuarios,
  adminActualId,
}: {
  usuarios: Usuario[]
  adminActualId: string
}) {
  const router = useRouter()
  const [borrandoId, setBorrandoId] = useState<string | null>(null)
  const [cambiandoId, setCambiandoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return true
    return (
      (u.nombre || '').toLowerCase().includes(texto) ||
      (u.email || '').toLowerCase().includes(texto)
    )
  })

  async function borrarUsuario(usuario: Usuario) {
    if (usuario.rol === 'docente' && usuario.totalCursos > 0) {
      alert(
        `Este docente tiene ${usuario.totalCursos} curso(s) creados. Reasígnalos o bórralos antes de eliminar la cuenta.`
      )
      return
    }

    const confirmado = window.confirm(
      `¿Eliminar la cuenta de "${usuario.nombre || usuario.email}"?\n\n` +
      'Esto borrará permanentemente:\n' +
      '- Su cuenta de acceso (no podrá volver a iniciar sesión)\n' +
      '- Sus compras registradas\n' +
      '- Su progreso en las lecciones\n' +
      '- Sus certificados emitidos\n\n' +
      'Esta acción no se puede deshacer.'
    )
    if (!confirmado) return

    setBorrandoId(usuario.id)
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al eliminar el usuario')
        return
      }

      router.refresh()
    } catch {
      alert('Error de conexión al eliminar el usuario')
    } finally {
      setBorrandoId(null)
    }
  }

  async function cambiarRol(usuario: Usuario, nuevoRol: string, e: React.ChangeEvent<HTMLSelectElement>) {
    if (nuevoRol === usuario.rol) return

    if (
      nuevoRol === 'admin' &&
      !window.confirm(`¿Convertir a "${usuario.nombre || usuario.email}" en administrador? Esto le dará acceso completo al panel de administración.`)
    ) {
      e.target.value = usuario.rol
      return
    }

    setCambiandoId(usuario.id)
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: nuevoRol }),
      })
      const data = await response.json()

      if (!data.ok) {
        alert(data.error || 'Error al cambiar el rol')
        e.target.value = usuario.rol
        return
      }

      router.refresh()
    } catch {
      alert('Error de conexión al cambiar el rol')
      e.target.value = usuario.rol
    } finally {
      setCambiandoId(null)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h3 className="text-base font-bold">
          {busqueda.trim()
            ? `Usuarios (${usuariosFiltrados.length} de ${usuarios.length})`
            : `Usuarios (${usuarios.length})`}
        </h3>
      </div>

      <div className="px-6 py-4 border-b border-slate-800">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
        />
      </div>

      {usuarios.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">No hay usuarios registrados.</div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">No se encontraron usuarios.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Nombre</th>
              <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Email</th>
              <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Rol</th>
              <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Registrado</th>
              <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-semibold">{u.nombre || '—'}</td>
                <td className="px-6 py-4 text-slate-400">{u.email}</td>
                <td className="px-6 py-4">
                  {u.id === adminActualId ? (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {ROL_LABEL[u.rol] || u.rol}
                    </span>
                  ) : (
                    <select
                      defaultValue={u.rol}
                      disabled={cambiandoId === u.id}
                      onChange={(e) => cambiarRol(u, e.target.value, e)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-yellow-500 disabled:opacity-50"
                    >
                      <option value="alumno">Alumno</option>
                      <option value="docente">Docente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-400">
                  {new Date(u.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  {u.id === adminActualId ? (
                    <span className="text-slate-600 text-xs">Tu cuenta</span>
                  ) : u.rol === 'admin' ? (
                    <span className="text-slate-600 text-xs">Administrador</span>
                  ) : (
                    <button
                      onClick={() => borrarUsuario(u)}
                      disabled={borrandoId === u.id}
                      className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {borrandoId === u.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
