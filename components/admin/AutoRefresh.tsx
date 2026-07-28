'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AutoRefreshProps {
  intervaloMs?: number
}

// Refresca periódicamente los datos del Server Component padre (router.refresh())
// sin recargar la página ni perder scroll/estado de UI. Se salta el refresh si la
// pestaña no está visible, para no gastar llamadas a Supabase de fondo. No renderiza nada.
export default function AutoRefresh({ intervaloMs = 30000 }: AutoRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      router.refresh()
    }, intervaloMs)
    return () => clearInterval(id)
  }, [router, intervaloMs])

  return null
}
