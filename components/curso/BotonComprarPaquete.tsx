'use client'

import { useState, useEffect, useRef } from 'react'

interface BotonComprarPaqueteProps {
  cursoIds: string[]
  onCerrar: () => void
  onExito: () => void
}

const POLL_INTERVALO_MS = 4000
const POLL_MAX_INTENTOS = 75

export default function BotonComprarPaquete({ cursoIds, onCerrar, onExito }: BotonComprarPaqueteProps) {
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState('')
  const [pagoIniciado, setPagoIniciado] = useState(false)
  const [pollAgotado, setPollAgotado] = useState(false)
  const [pagoExitoso, setPagoExitoso] = useState(false)
  const [resumen, setResumen] = useState<{ subtotal: number; descuento: number; total: number } | null>(null)
  const paqueteIdRef = useRef<string | null>(null)
  const verificandoRef = useRef(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleComprar() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payphone/paquete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoIds }),
      })

      const data = await response.json()

      if (!data.ok) {
        setError(data.error || 'Error al procesar el pago')
        setLoading(false)
        return
      }

      paqueteIdRef.current = data.paqueteId
      setResumen({ subtotal: data.subtotal, descuento: data.descuento, total: data.total })

      window.open(data.paymentUrl, '_blank')
      setPagoIniciado(true)
      setLoading(false)

    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  async function handleVerificar() {
    if (verificandoRef.current) return
    verificandoRef.current = true
    setVerificando(true)
    setError('')

    try {
      const response = await fetch('/api/payphone/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paqueteId: paqueteIdRef.current }),
      })

      const data = await response.json()

      if (data.ok) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        setPagoExitoso(true)
      } else {
        verificandoRef.current = false
        setError(data.error || 'El pago aún no ha sido confirmado')
        setVerificando(false)
      }

    } catch (error) {
      verificandoRef.current = false
      setError('Error al verificar el pago')
      setVerificando(false)
    }
  }

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

  if (pagoExitoso) {
    return (
      <div className="min-h-screen fixed inset-0 z-[60] bg-black/60 flex items-end md:items-center justify-center p-4">
        <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold mb-2 text-green-400">¡Pago exitoso!</h3>
          <p className="text-slate-400 mb-6">
            Ya tienes acceso a los {cursoIds.length} cursos del paquete.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/alumno" className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors">
              Mi dashboard
            </a>
            <button
              onClick={onExito}
              className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Seguir en cursos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen fixed inset-0 z-[60] bg-black/60 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {pagoIniciado ? 'Completa tu pago' : 'Confirmar paquete'}
          </h3>
          {!pagoIniciado && (
            <button onClick={onCerrar} className="text-slate-500 hover:text-white text-sm">
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        {!pagoIniciado ? (
          <>
            <p className="text-slate-400 text-sm mb-4">
              Vas a comprar {cursoIds.length} cursos con descuento de paquete.
            </p>
            <button
              onClick={handleComprar}
              disabled={loading}
              className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 w-full"
            >
              {loading ? 'Procesando...' : 'Continuar al pago'}
            </button>
            <p className="text-slate-500 text-xs text-center mt-2">
              Pago seguro con PayPhone · Tarjeta de crédito o débito
            </p>
          </>
        ) : (
          <>
            {resumen && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3 text-sm">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Subtotal</span>
                  <span>${resumen.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-400 mb-1">
                  <span>Descuento</span>
                  <span>-${resumen.descuento.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-700 mt-1">
                  <span>Total</span>
                  <span>${resumen.total.toFixed(2)}</span>
                </div>
              </div>
            )}

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
    </div>
  )
}
