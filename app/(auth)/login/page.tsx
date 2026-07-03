'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    const rol = perfil?.rol || 'alumno'

    if (rol === 'admin') {
      router.push('/admin')
    } else if (rol === 'docente') {
      router.push('/docente')
    } else {
      router.push('/alumno')
    }
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white">
            Exacta<span className="text-yellow-500">Lab</span>
          </Link>
          <p className="text-slate-400 mt-2">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

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
              placeholder="••••••••"
              autoComplete="current-password"
              required
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
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-slate-500 text-sm mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-yellow-500 font-semibold hover:text-yellow-400">
              Regístrate gratis
            </Link>
          </p>

        </form>
      </div>
    </main>
  )
}