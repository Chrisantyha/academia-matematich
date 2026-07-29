import { Nodo, num, variable, suma, prod, grupo, frac } from '../ast'
import { Rng } from '../rng'

export interface OpcionesFraccionAlgebraica {
  desplazamientoMin?: number // rango de m (m != 0), default -6..6
  desplazamientoMax?: number
}

// Técnica "Simplificación de fracción algebraica": envuelve el target E
// completo como (E·F)/F, con F=(x+m) al azar. El alumno tiene que cancelar F
// del numerador y el denominador para volver a E.
//
// Antes:  x² + 6x - 40
// Después: ((x² + 6x - 40)(x + 3))/(x + 3)
//
// Nota de diseño: el motor de mezcla (lib/algebra/mezcla.ts) trata el
// resultado de esta técnica como opaco — no vuelve a bajar dentro de un nodo
// 'frac'. Si otra técnica disfrazara por separado la copia de F del
// numerador y la del denominador, dejarían de verse idénticas y se perdería
// la pista visual de "esto se cancela", aunque el valor siguiera siendo
// correcto. Por eso esta técnica funciona mejor como la última del combo.
export function fraccionAlgebraica(objetivo: Nodo, rng: Rng, opciones: OpcionesFraccionAlgebraica = {}): Nodo {
  if (objetivo.tipo !== 'suma') {
    throw new Error('fraccionAlgebraica: se esperaba un polinomio (nodo "suma")')
  }

  const mMin = opciones.desplazamientoMin ?? -6
  const mMax = opciones.desplazamientoMax ?? 6
  const m = rng.randIntNoCero(mMin, mMax)

  const f = suma([variable('x'), num(m)])
  const numerador = prod([grupo(objetivo), grupo(f)])
  const denominador = grupo(f)

  return frac(numerador, denominador)
}
