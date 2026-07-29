import { Nodo, gradoDeTermino } from '../ast'
import { Rng } from '../rng'

// parte un entero `total` en dos partes enteras no nulas que suman `total`.
// Requiere |total| >= 2 (si no, no hay forma de partirlo en dos no nulos).
export function partirEnDosNoNulos(rng: Rng, total: number): [number, number] {
  if (!Number.isInteger(total)) {
    throw new Error('partirEnDosNoNulos: se esperaba un total entero')
  }
  const magnitud = Math.abs(total)
  if (magnitud < 2) {
    throw new Error('partirEnDosNoNulos: se necesita |total| >= 2 para partir en dos partes no nulas')
  }
  const signo = total > 0 ? 1 : -1
  const k = rng.randInt(1, magnitud - 1)
  const a = signo * k
  const b = total - a
  return [a, b]
}

// términos de una 'suma' que NO son el (los) de mayor grado clasificable —
// el término líder (ej. el x² de un trinomio) nunca se toca, para que la
// "forma" del polinomio siga siendo reconocible. Los términos de grado no
// clasificable (null, ya opacos por una técnica previa) SIEMPRE se incluyen:
// no son el líder, y siguen siendo candidatos válidos por su coeficiente.
export function terminosNoLideres(nodo: Extract<Nodo, { tipo: 'suma' }>): Nodo[] {
  if (nodo.terminos.length <= 1) return []
  const grados = nodo.terminos.map(gradoDeTermino)
  const clasificables = grados.filter((g): g is number => g !== null)
  if (clasificables.length === 0) return [...nodo.terminos]
  const gradoMax = Math.max(...clasificables)
  return nodo.terminos.filter((_, i) => grados[i] === null || grados[i] !== gradoMax)
}

// factores "no numéricos" de un término (todo lo que no sea num/frac) — lo
// que hay que preservar al reescribir el coeficiente de ese término.
export function partesVariablesDe(t: Nodo): Nodo[] {
  if (t.tipo === 'num' || t.tipo === 'frac') return []
  if (t.tipo === 'var' || t.tipo === 'pow' || t.tipo === 'grupo') return [t]
  if (t.tipo === 'prod') return t.factores.filter((f) => f.tipo !== 'num' && f.tipo !== 'frac')
  throw new Error(`partesVariablesDe: término "${t.tipo}" no soportado`)
}
