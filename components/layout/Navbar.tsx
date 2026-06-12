'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4 bg-[#0B0F1A]/90 backdrop-blur-md border-b border-[#1E2A42]">
      
      {/* LOGO */}
      <Link href="/" className="font-bold text-xl tracking-tight text-white">
        Exacta<span className="text-[#F5A623]">Lab</span>
      </Link>

      {/* LINKS */}
      <ul className="hidden md:flex gap-8 list-none">
        <li><Link href="/cursos" className="text-[#9AAEC8] hover:text-white text-sm font-medium transition-colors">Cursos</Link></li>
        <li><Link href="#precios" className="text-[#9AAEC8] hover:text-white text-sm font-medium transition-colors">Precios</Link></li>
        <li><Link href="#docentes" className="text-[#9AAEC8] hover:text-white text-sm font-medium transition-colors">Docentes</Link></li>
      </ul>

      {/* BOTONES */}
      <div className="flex gap-3 items-center">
        <Link href="/login" className="text-sm font-semibold text-white px-4 py-2 rounded-lg border border-[#1E2A42] hover:bg-[#131A28] transition-colors">
          Iniciar sesión
        </Link>
        <Link href="/registro" className="text-sm font-semibold bg-[#F5A623] text-black px-4 py-2 rounded-lg hover:bg-[#FFB83F] transition-colors">
          Comenzar gratis
        </Link>
      </div>

    </nav>
  )
}