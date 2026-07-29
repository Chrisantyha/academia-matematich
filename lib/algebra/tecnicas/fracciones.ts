import { Nodo, num, frac, prod, suma, grupo, coeficienteDeTermino } from '../ast'
import { Rng } from '../rng'
import { terminosNoLideres, partesVariablesDe, partirEnDosNoNulos } from './util'

export interface OpcionesFracciones {
  denominadorMin?: number // default 2
  denominadorMax?: number // default 6
}

function candidatos(objetivo: Extract<Nodo, { tipo: 'suma' }>): Nodo[] {
  return terminosNoLideres(objetivo).filter((t) => Number.isInteger(coeficienteDeTermino(t)))
}

export function aplicableFracciones(nodo: Nodo): boolean {
  return nodo.tipo === 'suma' && candidatos(nodo).length > 0
}

// Técnica "Fracciones": toma un término (no el líder) cuyo coeficiente es un
// entero c y lo reemplaza por dos términos fraccionarios con el mismo
// denominador n que vuelven a sumar c (a1/n + a2/n = c). El alumno tiene que
// sumar las fracciones para recuperar el coeficiente limpio.
//
// Antes:  x² + 3x + 5
// Después: x² + 3x + (12/4 + 8/4)     [n=4: 12/4 + 8/4 = 5]
export function fracciones(objetivo: Nodo, rng: Rng, opciones: OpcionesFracciones = {}): Nodo {
  if (objetivo.tipo !== 'suma') {
    throw new Error('fracciones: se esperaba un polinomio (nodo "suma")')
  }

  const elegibles = candidatos(objetivo)
  if (elegibles.length === 0) {
    throw new Error('fracciones: no hay términos con coeficiente entero disponibles para disfrazar')
  }
  const elegido = elegibles[rng.randInt(0, elegibles.length - 1)]
  const indiceOriginal = objetivo.terminos.indexOf(elegido)

  const c = coeficienteDeTermino(elegido)
  const partes = partesVariablesDe(elegido)

  const nMin = opciones.denominadorMin ?? 2
  const nMax = opciones.denominadorMax ?? 6
  const n = rng.randInt(nMin, nMax)
  const total = c * n
  const [a1, a2] = partirEnDosNoNulos(rng, total)

  const construir = (a: number): Nodo => {
    const fraccion = frac(num(a), num(n))
    return partes.length === 0 ? fraccion : prod([fraccion, ...partes])
  }

  // a1 y a2 siempre comparten el signo de `total` (ver partirEnDosNoNulos):
  // se factoriza ese signo común hacia afuera del grupo para que el renderer
  // muestre un único "-" limpio en vez de dos fracciones negativas sueltas.
  const signoComun = total < 0 ? -1 : 1
  const grupoFracciones = prod([
    num(signoComun),
    grupo(suma([construir(a1 * signoComun), construir(a2 * signoComun)])),
  ])

  // Las dos fracciones quedan agrupadas como UN solo término (no sueltas en
  // secuencia plana dentro de la suma del padre): sin esto, algo como
  // "25/6x + 23/6x" se pierde entre el resto de los sumandos del polinomio.
  const nuevosTerminos = [...objetivo.terminos]
  nuevosTerminos.splice(indiceOriginal, 1, grupoFracciones)
  return suma(nuevosTerminos)
}
