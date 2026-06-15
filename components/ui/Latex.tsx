'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface LatexProps {
  formula: string
  display?: boolean
  className?: string
}

export default function Latex({ formula, display = false, className = '' }: LatexProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(formula, ref.current, {
          displayMode: display,
          throwOnError: false,
          output: 'html',
        })
      } catch (e) {
        if (ref.current) {
          ref.current.textContent = formula
        }
      }
    }
  }, [formula, display])

  return <span ref={ref} className={className} />
}