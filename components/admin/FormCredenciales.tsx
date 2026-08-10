'use client'

import { useState, useTransition } from 'react'
import { actualizarCredenciales } from '@/lib/actions/admin-alumno'

export default function FormCredenciales({ usuarioId, emailActual }: { usuarioId: string; emailActual: string }) {
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevaClave, setNuevaClave] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const [pendiente, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensaje(null)

    if (!nuevoEmail && !nuevaClave) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un nuevo correo, una nueva contraseña, o ambos.' })
      return
    }

    const confirmacion = window.confirm(
      `¿Confirmas actualizar las credenciales de ${emailActual}? Esta acción cambia cómo esta persona inicia sesión de inmediato.`
    )
    if (!confirmacion) return

    const formData = new FormData()
    formData.set('usuarioId', usuarioId)
    if (nuevoEmail) formData.set('nuevoEmail', nuevoEmail)
    if (nuevaClave) formData.set('nuevaClave', nuevaClave)

    startTransition(async () => {
      const resultado = await actualizarCredenciales(formData)
      if (resultado?.error) {
        setMensaje({ tipo: 'error', texto: resultado.error })
      } else {
        setMensaje({ tipo: 'success', texto: 'Credenciales actualizadas correctamente.' })
        setNuevoEmail('')
        setNuevaClave('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Nuevo correo
        </label>
        <input
          type="email"
          value={nuevoEmail}
          onChange={(e) => setNuevoEmail(e.target.value)}
          placeholder={emailActual}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Nueva contraseña
        </label>
        <input
          type="text"
          value={nuevaClave}
          onChange={(e) => setNuevaClave(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
        />
        <p className="text-slate-500 text-xs mt-1">
          Se muestra en texto plano para que puedas copiarla y compartirla de forma segura con la persona.
        </p>
      </div>

      {mensaje && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          mensaje.tipo === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
      >
        {pendiente ? 'Actualizando...' : 'Actualizar credenciales'}
      </button>
    </form>
  )
}