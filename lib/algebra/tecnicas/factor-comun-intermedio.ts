import { Nodo, num, prod, suma, coeficienteDeTermino } from '../ast'
import { Rng } from '../rng'
import { partesVariablesDe } from './util'

// Una igualdad (ecuación): lado izquierdo y derecho, cada uno una expresión
// en x. No es un 'Nodo' porque una ecuación no es una expresión evaluable
// por sí sola — es un par que debe evaluarse por separado a cada lado.
export interface Igualdad {
  izquierda: Nodo
  derecha: Nodo
}

export interface OpcionesFactorComunIntermedio {
  factorMin?: number // |m|, default 2..6
  factorMax?: number
}

function escalarTermino(t: Nodo, m: number): Nodo {
  if (t.tipo === 'num') return num(t.valor * m)
  const partes = partesVariablesDe(t)
  const c = coeficienteDeTermino(t) * m
  return partes.length === 0 ? num(c) : prod([num(c), ...partes])
}

function escalar(n: Nodo, m: number): Nodo {
  if (n.tipo === 'suma') return suma(n.terminos.map((t) => escalarTermino(t, m)))
  return escalarTermino(n, m)
}

// Técnica "Factor común intermedio": multiplica AMBOS lados de una igualdad
// por la misma constante m, distribuyendo el producto (sin mostrar el
// "×m" explícito) — el alumno tiene que notar el factor común entre todos
// los coeficientes de ambos lados antes de poder simplificar la ecuación.
// Solo tiene sentido para una IGUALDAD (ax+b=c): escalar ambos lados por
// igual preserva las soluciones porque es una relación de equivalencia, algo
// que NO vale para una expresión sola (factorizar "x²+bx+c" cambiaría de
// valor si se escala, ver nota en el diseño de la Tanda 3).
//
// Antes:  2x + 6 = 20
// Después: 10x + 30 = 100     [m=5]
//
// NOTA: standalone en esta tanda — no hay todavía ningún generador de tipo
// ecuación enganchado al motor de mezcla (eso es trabajo de la Tanda 5,
// cuando se retoquen ecuacion_lineal y compañía). Se construye y se verifica
// acá para que quede lista para conectar entonces.
export function factorComunIntermedio(
  igualdad: Igualdad,
  rng: Rng,
  opciones: OpcionesFactorComunIntermedio = {}
): Igualdad {
  const factorMin = opciones.factorMin ?? 2
  const factorMax = opciones.factorMax ?? 6
  const signo = rng.randInt(0, 1) === 0 ? 1 : -1
  const m = rng.randInt(factorMin, factorMax) * signo

  return {
    izquierda: escalar(igualdad.izquierda, m),
    derecha: escalar(igualdad.derecha, m),
  }
}
