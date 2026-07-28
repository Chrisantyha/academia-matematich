'use client'

import { useEffect, useRef, useState } from 'react'

interface OpcionCombobox {
  value: string
  label: string
}

interface ComboboxProps {
  opciones: OpcionCombobox[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function Combobox({ opciones, value, onChange, placeholder }: ComboboxProps) {
  const [query, setQuery] = useState('')
  const [buscando, setBuscando] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionada = opciones.find((o) => o.value === value)
  const abierto = buscando

  const filtradas = !abierto
    ? []
    : query.trim() === ''
      ? opciones
      : opciones.filter((o) => {
          const q = normalizar(query)
          return normalizar(o.label).includes(q) || normalizar(o.value).includes(q)
        })

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setBuscando(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [])

  function seleccionar(opcion: OpcionCombobox) {
    onChange(opcion.value)
    setQuery('')
    setBuscando(false)
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <input
        type="text"
        value={buscando ? query : seleccionada?.label || ''}
        onChange={(e) => {
          setQuery(e.target.value)
          setBuscando(true)
        }}
        onFocus={() => {
          setQuery('')
          setBuscando(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery('')
            setBuscando(false)
            e.currentTarget.blur()
          }
        }}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
      />

      {abierto && (
        <div className="absolute z-10 mt-2 w-full max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-lg">
          {filtradas.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Sin resultados</div>
          ) : (
            filtradas.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => seleccionar(o)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-700 ${
                  o.value === value ? 'text-yellow-500' : 'text-white'
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
