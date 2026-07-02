'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">

      {/* LOGO */}
      <Link href="/" className="font-bold text-xl tracking-tight text-white">
        Exacta<span className="text-yellow-500">Lab</span>
      </Link>

      {/* LINKS */}
      <ul className="hidden md:flex gap-8 list-none">
        <li><Link href="/cursos" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Cursos</Link></li>
        <li><Link href="#precios" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Precios</Link></li>
        <li><Link href="#docentes" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Docentes</Link></li>
      </ul>

      {/* BOTONES */}
      <div className="flex gap-3 items-center">
        <Link href="/login" className="text-sm font-semibold text-white px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
          Iniciar sesión
        </Link>
        <Link href="/registro" className="text-sm font-semibold bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
          Comenzar gratis
        </Link>
      </div>

    </nav>
  )
}