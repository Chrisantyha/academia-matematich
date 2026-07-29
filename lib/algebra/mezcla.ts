import { Nodo } from './ast'
import { Rng } from './rng'
import { distribucion } from './tecnicas/distribucion'
import { fracciones, aplicableFracciones } from './tecnicas/fracciones'
import { agrupacion, aplicableAgrupacion } from './tecnicas/agrupacion'
import { fraccionAlgebraica } from './tecnicas/fraccion-algebraica'

// ---------- navegación inmutable del árbol ----------
//
// Un 'camino' describe cómo bajar desde la raíz hasta un sub-nodo. Sirve para
// que el motor de mezcla pueda elegir CUALQUIER sub-expresión del árbol (no
// solo la raíz) como blanco de una técnica, y después reconstruir el árbol
// con ese sub-nodo reemplazado, sin mutar nada.

type Paso =
  | { tipo: 'suma-termino'; indice: number }
  | { tipo: 'prod-factor'; indice: number }
  | { tipo: 'pow-base' }
  | { tipo: 'grupo-expr' }

type Camino = Paso[]

// Junta todos los sub-nodos tipo 'suma' alcanzables desde `nodo`, con el
// camino para llegar a cada uno. Deliberadamente NO baja dentro de un nodo
// 'frac' (ver nota de diseño en tecnicas/fraccion-algebraica.ts): una vez
// que algo queda envuelto en una fracción por esa técnica, se vuelve opaco
// para el resto de la mezcla.
export function recolectarSumas(nodo: Nodo, camino: Camino = []): { camino: Camino; nodo: Extract<Nodo, { tipo: 'suma' }> }[] {
  const resultados: { camino: Camino; nodo: Extract<Nodo, { tipo: 'suma' }> }[] = []
  if (nodo.tipo === 'suma') {
    resultados.push({ camino, nodo })
    nodo.terminos.forEach((t, i) => resultados.push(...recolectarSumas(t, [...camino, { tipo: 'suma-termino', indice: i }])))
  } else if (nodo.tipo === 'prod') {
    nodo.factores.forEach((f, i) => resultados.push(...recolectarSumas(f, [...camino, { tipo: 'prod-factor', indice: i }])))
  } else if (nodo.tipo === 'pow') {
    resultados.push(...recolectarSumas(nodo.base, [...camino, { tipo: 'pow-base' }]))
  } else if (nodo.tipo === 'grupo') {
    resultados.push(...recolectarSumas(nodo.expr, [...camino, { tipo: 'grupo-expr' }]))
  }
  // 'frac': opaco a propósito. 'num'/'var': hojas, nada que recolectar.
  return resultados
}

export function reemplazarEnCamino(raiz: Nodo, camino: Camino, nuevo: Nodo): Nodo {
  if (camino.length === 0) return nuevo
  const [paso, ...resto] = camino
  switch (paso.tipo) {
    case 'suma-termino': {
      if (raiz.tipo !== 'suma') throw new Error('reemplazarEnCamino: paso "suma-termino" no coincide con el nodo')
      const terminos = raiz.terminos.map((t, i) => (i === paso.indice ? reemplazarEnCamino(t, resto, nuevo) : t))
      return { ...raiz, terminos }
    }
    case 'prod-factor': {
      if (raiz.tipo !== 'prod') throw new Error('reemplazarEnCamino: paso "prod-factor" no coincide con el nodo')
      const factores = raiz.factores.map((f, i) => (i === paso.indice ? reemplazarEnCamino(f, resto, nuevo) : f))
      return { ...raiz, factores }
    }
    case 'pow-base': {
      if (raiz.tipo !== 'pow') throw new Error('reemplazarEnCamino: paso "pow-base" no coincide con el nodo')
      return { ...raiz, base: reemplazarEnCamino(raiz.base, resto, nuevo) }
    }
    case 'grupo-expr': {
      if (raiz.tipo !== 'grupo') throw new Error('reemplazarEnCamino: paso "grupo-expr" no coincide con el nodo')
      return { ...raiz, expr: reemplazarEnCamino(raiz.expr, resto, nuevo) }
    }
  }
}

// ---------- registro de técnicas ----------

export interface Tecnica {
  nombre: string
  aplicable(nodo: Nodo): boolean
  aplicar(nodo: Nodo, rng: Rng): Nodo
}

export const TECNICAS_DISFRAZ: Tecnica[] = [
  { nombre: 'distribucion', aplicable: (n) => n.tipo === 'suma', aplicar: (n, rng) => distribucion(n, rng) },
  { nombre: 'fracciones', aplicable: aplicableFracciones, aplicar: (n, rng) => fracciones(n, rng) },
  { nombre: 'agrupacion', aplicable: aplicableAgrupacion, aplicar: (n, rng) => agrupacion(n, rng) },
  { nombre: 'fraccion_algebraica', aplicable: (n) => n.tipo === 'suma', aplicar: (n, rng) => fraccionAlgebraica(n, rng) },
]

// ---------- guardas de complejidad ----------

function contarTerminos(nodo: Nodo): number {
  switch (nodo.tipo) {
    case 'num':
    case 'var':
      return 1
    case 'pow':
      return 1
    case 'suma':
      return nodo.terminos.reduce((acc, t) => acc + contarTerminos(t), 0)
    case 'prod':
      return nodo.factores.reduce((acc, f) => acc + contarTerminos(f), 0)
    case 'grupo':
      return contarTerminos(nodo.expr)
    case 'frac':
      return contarTerminos(nodo.numerador) + contarTerminos(nodo.denominador)
  }
}

function profundidadMaxima(nodo: Nodo): number {
  switch (nodo.tipo) {
    case 'num':
    case 'var':
      return 0
    case 'pow':
      return profundidadMaxima(nodo.base)
    case 'suma':
      return nodo.terminos.length === 0 ? 0 : Math.max(...nodo.terminos.map(profundidadMaxima))
    case 'prod':
      return nodo.factores.length === 0 ? 0 : Math.max(...nodo.factores.map(profundidadMaxima))
    case 'grupo':
      return 1 + profundidadMaxima(nodo.expr)
    case 'frac':
      return 1 + Math.max(profundidadMaxima(nodo.numerador), profundidadMaxima(nodo.denominador))
  }
}

// ---------- motor de mezcla ----------

export interface OpcionesMezcla {
  minTecnicas?: number // default 1
  maxTecnicas?: number // default 3
  maxTerminosTotales?: number // default 14
  maxProfundidad?: number // default 4
  maxIntentos?: number // default 20
}

export interface ResultadoMezcla {
  nodo: Nodo
  tecnicasAplicadas: string[]
}

// Elige entre 1 y 3 técnicas al azar y las aplica en secuencia, cada una a un
// sub-nodo elegido al azar entre TODOS los alcanzables (no solo la raíz) —
// así la mezcla queda distribuida dentro de la expresión en vez de ser "una
// capa afuera de otra". Si una combinación se pasa de los límites de
// complejidad, se reintenta con otra; si no se logra nada dentro de
// `maxIntentos`, se devuelve el nodo original sin disfrazar (nunca falla).
export function aplicarMezcla(objetivoRaiz: Nodo, rng: Rng, opciones: OpcionesMezcla = {}): ResultadoMezcla {
  const minT = opciones.minTecnicas ?? 1
  const maxT = opciones.maxTecnicas ?? 3
  const maxTerminos = opciones.maxTerminosTotales ?? 14
  const maxProf = opciones.maxProfundidad ?? 4
  const maxIntentos = opciones.maxIntentos ?? 20

  for (let intento = 0; intento < maxIntentos; intento++) {
    let actual = objetivoRaiz
    const aplicadas: string[] = []
    const n = rng.randInt(minT, maxT)
    let ok = true

    for (let i = 0; i < n; i++) {
      const candidatosSuma = recolectarSumas(actual)
      const opcionesDisponibles: { camino: Camino; nodo: Nodo; tecnica: Tecnica }[] = []
      for (const { camino, nodo } of candidatosSuma) {
        for (const tecnica of TECNICAS_DISFRAZ) {
          if (tecnica.aplicable(nodo)) opcionesDisponibles.push({ camino, nodo, tecnica })
        }
      }
      if (opcionesDisponibles.length === 0) {
        ok = false
        break
      }
      const elegido = opcionesDisponibles[rng.randInt(0, opcionesDisponibles.length - 1)]
      const nodoTransformado = elegido.tecnica.aplicar(elegido.nodo, rng)
      actual = reemplazarEnCamino(actual, elegido.camino, nodoTransformado)
      aplicadas.push(elegido.tecnica.nombre)
    }

    if (!ok) continue
    if (contarTerminos(actual) > maxTerminos) continue
    if (profundidadMaxima(actual) > maxProf) continue

    return { nodo: actual, tecnicasAplicadas: aplicadas }
  }

  return { nodo: objetivoRaiz, tecnicasAplicadas: [] }
}
