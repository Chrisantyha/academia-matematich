'use client'

import { useEffect, useState } from 'react'

interface VideoPlayerProps {
  // Lección cuyo video se va a reproducir. El reproductor le pide a
  // /api/lecciones/[id]/video un enlace firmado y temporal; esa ruta verifica
  // que el usuario tenga acceso al curso.
  leccionId: string
  titulo?: string
}

export default function VideoPlayer({ leccionId, titulo }: VideoPlayerProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    setSrc(null)
    setError('')

    async function cargar() {
      try {
        const respuesta = await fetch(`/api/lecciones/${leccionId}/video`, { cache: 'no-store' })
        const datos = await respuesta.json()
        if (!activo) return
        if (datos.ok && datos.src) {
          setSrc(datos.src)
        } else {
          setError(datos.error || 'No se pudo cargar el video')
        }
      } catch {
        if (activo) setError('Error de conexión al cargar el video')
      }
    }

    cargar()

    return () => {
      activo = false
    }
  }, [leccionId])

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden">
      {titulo && (
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">{titulo}</h3>
        </div>
      )}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        {src ? (
          <iframe
            key={src}
            src={`https://iframe.cloudflarestream.com/${src}`}
            title={titulo || 'Video de la lección'}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className={`text-sm ${error ? 'text-red-400' : 'text-slate-400'}`}>
              {error || 'Cargando video...'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
