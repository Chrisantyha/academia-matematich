'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Navbar() {
  const [cargando, setCargando] = useState(true)
  const [rol, setRol] = useState<string | null>(null)
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    let activo = true

    async function cargarSesion() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (activo) {
          setRol(null)
          setCargando(false)
        }
        return
      }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (activo) {
        setRol(perfil?.rol || 'alumno')
        setCargando(false)
      }
    }

    cargarSesion()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      cargarSesion()
    })

    return () => {
      activo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const dashboardHref = rol === 'admin' ? '/admin' : rol === 'docente' ? '/docente' : '/alumno'

  // Detecta el bloque actual según la ruta
  const bloque = pathname?.startsWith('/kids')
    ? 'kids'
    : pathname?.startsWith('/bachillerato')
    ? 'bachillerato'
    : pathname?.startsWith('/universitario')
    ? 'universitario'
    : null

  const cursosHref = bloque ? `/${bloque}/cursos` : '/cursos'

  const esKids = bloque === 'kids'
  const acento = esKids ? 'text-amber-300' : 'text-yellow-500'
  const acentoBg = esKids ? 'bg-amber-300 hover:bg-amber-200' : 'bg-yellow-500 hover:bg-yellow-400'
  const fondoNav = esKids ? 'bg-[#0d0b26]/90 border-white/10' : 'bg-slate-950/90 border-slate-800'
  const textoSecundario = esKids ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-white'
  const textoBoton = esKids ? 'text-white border-white/20 hover:bg-white/10' : 'text-white border-slate-700 hover:bg-slate-800'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4 backdrop-blur-md border-b ${fondoNav}`}>

      {/* LOGO */}
      <Link href="/" className="font-bold text-xl tracking-tight text-white">
        Exacta<span className={acento}>{esKids ? 'Kids' : 'Lab'}</span>
      </Link>

      {/* LINKS */}
      <ul className="hidden md:flex gap-8 list-none">
        <li><Link href={cursosHref} className={`text-sm font-medium transition-colors ${textoSecundario}`}>Cursos</Link></li>
      </ul>

      {/* BOTONES */}
      <div className="flex gap-3 items-center">
        {cargando ? (
          <div className="w-40 h-9" />
        ) : rol ? (
          <Link
            href={dashboardHref}
            className={`text-sm font-semibold text-black px-4 py-2 rounded-lg transition-colors ${acentoBg}`}
          >
            Ir a mi panel
          </Link>
        ) : (
          <>
            <Link href="/login" className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${textoBoton}`}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className={`text-sm font-semibold text-black px-4 py-2 rounded-lg transition-colors ${acentoBg}`}>
              Comenzar gratis
            </Link>
          </>
        )}
      </div>

    </nav>
  )
}