'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [correoEnviado, setCorreoEnviado] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      }
    })

    if (error) {
      setError('Error al crear la cuenta. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // Si el proyecto no exige confirmar el correo, signUp ya devuelve una
    // sesión iniciada: se entra directo al panel.
    if (data.session) {
      router.push('/alumno')
      router.refresh()
      return
    }

    // Si exige confirmación, todavía no hay sesión: se le avisa que revise
    // su correo (antes se lo mandaba a /login sin explicación y el inicio
    // de sesión fallaba hasta que confirmara).
    setCorreoEnviado(true)
    setLoading(false)
  }

  if (correoEnviado) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-white">
              Exacta<span className="text-yellow-500">Lab</span>
            </Link>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-xl font-bold text-white mb-3">Revisa tu correo</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-2">
              Te enviamos un enlace de confirmación a
            </p>
            <p className="text-yellow-500 font-semibold text-sm mb-4 break-all">{email}</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Ábrelo para activar tu cuenta y luego inicia sesión. Si no lo ves en unos minutos, revisa la carpeta de spam.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white">
            Exacta<span className="text-yellow-500">Lab</span>
          </Link>
          <p className="text-slate-400 mt-2">Crea tu cuenta gratis</p>
        </div>

        <form onSubmit={handleRegistro} className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Contraseña
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>

          <p className="text-center text-slate-500 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-yellow-500 font-semibold hover:text-yellow-400">
              Inicia sesión
            </Link>
          </p>

        </form>
      </div>
    </main>
  )
}