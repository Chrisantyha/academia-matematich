'use client'

import Latex from './Latex'

interface TextoMathProps {
  texto: string
  className?: string
}

// Renderiza texto normal mezclado con formulas LaTeX
// Ejemplo: "La derivada de $x^2$ es $2x$"
// Las formulas van entre $ para inline y $$ para display

export default function TextoMath({ texto, className = '' }: TextoMathProps) {
  // Separar texto normal de formulas LaTeX
  const partes = texto.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/)

  return (
    <span className={className}>
      {partes.map((parte, index) => {
        // Formula display (entre $$)
        if (parte.startsWith('$$') && parte.endsWith('$$')) {
          const formula = parte.slice(2, -2)
          return (
            <span key={index} className="block my-2">
              <Latex formula={formula} display={true} />
            </span>
          )
        }
        // Formula inline (entre $)
        if (parte.startsWith('$') && parte.endsWith('$')) {
          const formula = parte.slice(1, -1)
          return <Latex key={index} formula={formula} display={false} />
        }
        // Texto normal
        return <span key={index}>{parte}</span>
      })}
    </span>
  )
}