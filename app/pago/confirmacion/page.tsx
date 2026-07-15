'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ConfirmacionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [estado, setEstado] = useState<'cargando' | 'exito' | 'error'>('cargando')
  const [mensaje, setMensaje] = useState('')
  const [cursoId, setCursoId] = useState('')

  useEffect(() => {
    async function confirmar() {
      const id = searchParams.get('id')
      const clientTransactionId = searchParams.get('clientTransactionId')

      if (!id || !clientTransactionId) {
        setEstado('error')
        setMensaje('No se recibieron los datos del pago')
        return
      }

      try {
        const response = await fetch('/api/payphone/confirmar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, clientTransactionId }),
        })

        const data = await response.json()

        if (data.ok) {
          setEstado('exito')
          setCursoId(data.cursoId)
          setMensaje('¡Pago confirmado! Ya tienes acceso al curso.')
        } else {
          setEstado('error')
          setMensaje(data.error || 'El pago no pudo ser confirmado')
        }
      } catch (error) {
        setEstado('error')
        setMensaje('Error al confirmar el pago')
      }
    }

    confirmar()
  }, [searchParams])

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {estado === 'cargando' && (
          <>
            <div className="text-6xl mb-6 animate-pulse">⏳</div>
            <h1 className="text-2xl font-bold mb-2">Confirmando tu pago...</h1>
            <p className="text-slate-400">Un momento por favor.</p>
          </>
        )}

        {estado === 'exito' && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold mb-2 text-green-400">¡Pago exitoso!</h1>
            <p className="text-slate-400 mb-8">{mensaje}</p>

            <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6 mb-8">
              <div className="text-green-400 text-sm font-semibold mb-2">
                ✅ Acceso desbloqueado
              </div>
              <p className="text-slate-400 text-sm">
                Ya puedes ver todas las lecciones del curso.
              </p>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href={`/cursos/${cursoId}`}
                className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Ir al curso
              </Link>
              <Link
                href="/alumno"
                className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Mi dashboard
              </Link>
            </div>
          </>
        )}

        {estado === 'error' && (
          <>
            <div className="text-6xl mb-6">😔</div>
            <h1 className="text-3xl font-bold mb-2 text-red-400">Pago no completado</h1>
            <p className="text-slate-400 mb-8">{mensaje}</p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/cursos"
                className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Volver a cursos
              </Link>
              <Link
                href="/alumno"
                className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Mi dashboard
              </Link>
            </div>
          </>
        )}

      </div>
    </main>
  )
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </main>
    }>
      <ConfirmacionContent />
    </Suspense>
  )
}