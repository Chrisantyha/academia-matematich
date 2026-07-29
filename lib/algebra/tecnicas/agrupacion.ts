import { Nodo, num, prod, suma, coeficienteDeTermino } from '../ast'
import { Rng } from '../rng'
import { terminosNoLideres, partesVariablesDe, partirEnDosNoNulos } from './util'

function candidatos(objetivo: Extract<Nodo, { tipo: 'suma' }>): Nodo[] {
  return terminosNoLideres(objetivo).filter((t) => {
    const c = coeficienteDeTermino(t)
    return Number.isInteger(c) && Math.abs(c) >= 2
  })
}

export function aplicableAgrupacion(nodo: Nodo): boolean {
  return nodo.tipo === 'suma' && candidatos(nodo).length > 0
}

// Técnica "Agrupación": separa un término (no el líder) en dos del mismo
// "cuerpo" que suman al original (ej. 6x -> 2x + 4x), imitando la forma sin
// combinar que usa la factorización por agrupación. A diferencia de
// Fracciones, parte en dos ENTEROS, no en fracciones.
//
// Antes:  x² + 6x - 40
// Después: x² + 2x + 4x - 40     [2+4=6]
export function agrupacion(objetivo: Nodo, rng: Rng): Nodo {
  if (objetivo.tipo !== 'suma') {
    throw new Error('agrupacion: se esperaba un polinomio (nodo "suma")')
  }

  const elegibles = candidatos(objetivo)
  if (elegibles.length === 0) {
    throw new Error('agrupacion: no hay términos con coeficiente entero |c| >= 2 disponibles')
  }
  const elegido = elegibles[rng.randInt(0, elegibles.length - 1)]
  const indiceOriginal = objetivo.terminos.indexOf(elegido)

  const c = coeficienteDeTermino(elegido)
  const partes = partesVariablesDe(elegido)
  const [p, q] = partirEnDosNoNulos(rng, c)

  const construir = (valor: number): Nodo => (partes.length === 0 ? num(valor) : prod([num(valor), ...partes]))

  const nuevosTerminos = [...objetivo.terminos]
  nuevosTerminos.splice(indiceOriginal, 1, construir(p), construir(q))
  return suma(nuevosTerminos)
}
