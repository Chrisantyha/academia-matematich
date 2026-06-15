'use client'

export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors"
    >
      🖨️ Imprimir certificado
    </button>
  )
}