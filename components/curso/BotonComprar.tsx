'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BotonComprarProps {
  cursoId: string
  precio: number
  titulo: string
}

export default function BotonComprar({ cursoId, precio, titulo }: BotonComprarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState('')
  const [pagoIniciado, setPagoIniciado] = useState(false)

  async function handleComprar() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payphone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId, monto: precio }),
      })

      const data = await response.json()

      if (!data.ok) {
        setError(data.error || 'Error al procesar el pago')
        setLoading(false)
        return
      }

      // Abrir PayPhone en pestaña nueva
      window.open(data.paymentUrl, '_blank')
      setPagoIniciado(true)
      setLoading(false)

    } catch (error) {
      setError('Error de conexion. Intenta de nuevo.')
      setLoading(false)
    }
  }

  async function handleVerificar() {
    setVerificando(true)
    setError('')

    try {
      const response = await fetch('/api/payphone/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId }),
      })

      const data = await response.json()

      if (data.ok) {
        router.refresh()
        window.location.reload()
      } else {
        setError(data.error || 'El pago aun no ha sido confirmado')
        setVerificando(false)
      }

    } catch (error) {
      setError('Error al verificar el pago')
      setVerificando(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      {!pagoIniciado ? (
        <>
          <button
            onClick={handleComprar}
            disabled={loading}
            className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 w-full"
          >
            {loading ? 'Procesando...' : `Comprar por $${precio}`}
          </button>
          <p className="text-slate-500 text-xs text-center mt-2">
            Pago seguro con PayPhone · Tarjeta de crédito o débito
          </p>
        </>
      ) : (
        <>
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 mb-3">
            <p className="text-sky-400 text-sm font-semibold mb-1">
              💳 Pago en proceso
            </p>
            <p className="text-slate-400 text-xs">
              Completa el pago en la pestaña de PayPhone y luego haz clic en verificar.
            </p>
          </div>

          <button
            onClick={handleVerificar}
            disabled={verificando}
            className="bg-green-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 w-full mb-2"
          >
            {verificando ? 'Verificando...' : '✓ Ya pagué — Verificar'}
          </button>

          <button
            onClick={() => { setPagoIniciado(false); setError('') }}
            className="border border-slate-700 text-slate-400 font-semibold px-8 py-2 rounded-xl hover:bg-slate-800 transition-colors w-full text-sm"
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  )
}