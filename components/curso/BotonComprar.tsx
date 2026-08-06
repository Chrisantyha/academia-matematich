'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface BotonComprarProps {
  cursoId: string
  precio: number
  titulo: string
}

// Polling automatico mientras el pago esta "pendiente": cada 4s, hasta 75
// intentos (~5 minutos) antes de rendirse y pedirle al usuario que verifique
// manualmente.
const POLL_INTERVALO_MS = 4000
const POLL_MAX_INTENTOS = 75

export default function BotonComprar({ cursoId, precio, titulo }: BotonComprarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState('')
  const [pagoIniciado, setPagoIniciado] = useState(false)
  const [pollAgotado, setPollAgotado] = useState(false)
  const verificandoRef = useRef(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    // Evita llamadas superpuestas: el polling automatico puede caer justo
    // encima de un click manual (o de otro tick) que todavia esta en vuelo.
    if (verificandoRef.current) return
    verificandoRef.current = true
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
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        router.refresh()
        window.location.reload()
      } else {
        verificandoRef.current = false
        setError(data.error || 'El pago aun no ha sido confirmado')
        setVerificando(false)
      }

    } catch (error) {
      verificandoRef.current = false
      setError('Error al verificar el pago')
      setVerificando(false)
    }
  }

  // Mientras el pago este "pendiente", reintenta la verificacion sola en vez
  // de obligar al usuario a hacer click. Se limpia al desmontar, al cancelar
  // (pagoIniciado pasa a false) y al agotar el limite de intentos.
  useEffect(() => {
    if (!pagoIniciado) return

    let intentos = 0
    setPollAgotado(false)

    const intervalId = setInterval(() => {
      intentos++
      if (intentos > POLL_MAX_INTENTOS) {
        clearInterval(intervalId)
        pollIntervalRef.current = null
        setPollAgotado(true)
        return
      }
      handleVerificar()
    }, POLL_INTERVALO_MS)

    pollIntervalRef.current = intervalId

    return () => {
      clearInterval(intervalId)
      pollIntervalRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoIniciado])

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
              Completa el pago en la pestaña de PayPhone. Estamos verificando automáticamente, o puedes hacer clic en verificar.
            </p>
          </div>

          {pollAgotado && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-3">
              <p className="text-amber-400 text-xs">
                No pudimos confirmar el pago automáticamente. Haz clic en "Ya pagué — Verificar" o contacta a soporte si ya pagaste.
              </p>
            </div>
          )}

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