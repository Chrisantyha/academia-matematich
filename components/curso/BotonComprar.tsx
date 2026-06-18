'use client'

import { useState } from 'react'

interface BotonComprarProps {
  cursoId: string
  precio: number
  titulo: string
}

export default function BotonComprar({ cursoId, precio, titulo }: BotonComprarProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleComprar() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payphone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoId,
          monto: precio,
        }),
      })

      const data = await response.json()

      if (!data.ok) {
        setError(data.error || 'Error al procesar el pago')
        setLoading(false)
        return
      }

      window.location.href = data.paymentUrl

    } catch (error) {
      setError('Error de conexion. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}
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
    </div>
  )
}