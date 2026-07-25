'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ActualizarPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [enlaceValido, setEnlaceValido] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // El link de recuperación de Supabase trae un `code` en la URL. El cliente
  // browser (flowType: pkce, detectSessionInUrl: true) lo intercambia por una
  // sesión automáticamente al cargar la página y dispara PASSWORD_RECOVERY.
  useEffect(() => {
    let activo = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (activo && session) {
        setEnlaceValido(true)
        setVerificando(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setEnlaceValido(true)
        setVerificando(false)
      }
    })

    const timeout = setTimeout(() => {
      if (activo) setVerificando(false)
    }, 3000)

    return () => {
      activo = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabase])

  async function handleActualizar(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo actualizar la contraseña. Solicita un nuevo enlace.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/login?mensaje=password-actualizada')
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white">
            Exacta<span className="text-yellow-500">Lab</span>
          </Link>
          <p className="text-slate-400 mt-2">Establece tu nueva contraseña</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {verificando ? (
            <p className="text-center text-slate-400 text-sm">Verificando enlace...</p>
          ) : !enlaceValido ? (
            <div className="text-center">
              <p className="text-red-400 text-sm mb-6">
                Este enlace no es válido o ya expiró.
              </p>
              <Link href="/recuperar-password" className="text-yellow-500 font-semibold hover:text-yellow-400 text-sm">
                Solicitar un nuevo enlace
              </Link>
            </div>
          ) : (
            <form onSubmit={handleActualizar}>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Confirma la nueva contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
