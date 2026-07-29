// AST algebraico mínimo: representa polinomios (y ahora fracciones algebraicas)
// en `x` como árbol, en vez de strings ya formateados, para poder reescribirlos
// (técnicas de disfraz) antes de renderizarlos.
//
// Invariante que deben respetar quienes construyen nodos: nunca incluir un
// término de valor exactamente cero dentro de una 'suma' (igual que hoy
// formatoSiguiente se omite a mano cuando el coeficiente es 0). El renderer
// no filtra ceros porque, para un 'prod', no hay forma general de distinguir
// "coeficiente 0" de "cadena que termina en 0" sin volver a evaluar.

export type Nodo =
  | { tipo: 'num'; valor: number }
  | { tipo: 'var'; nombre: string }
  | { tipo: 'pow'; base: Nodo; exponente: number }
  | { tipo: 'suma'; terminos: Nodo[] }
  | { tipo: 'prod'; factores: Nodo[] }
  | { tipo: 'grupo'; expr: Nodo }
  | { tipo: 'frac'; numerador: Nodo; denominador: Nodo }

export const num = (valor: number): Nodo => ({ tipo: 'num', valor })
export const variable = (nombre: string = 'x'): Nodo => ({ tipo: 'var', nombre })
export const potencia = (base: Nodo, exponente: number): Nodo => ({ tipo: 'pow', base, exponente })
export const suma = (terminos: Nodo[]): Nodo => ({ tipo: 'suma', terminos })
export const prod = (factores: Nodo[]): Nodo => ({ tipo: 'prod', factores })
export const grupo = (expr: Nodo): Nodo => ({ tipo: 'grupo', expr })
export const frac = (numerador: Nodo, denominador: Nodo): Nodo => ({ tipo: 'frac', numerador, denominador })

// ---------- evaluación numérica (la usa la red de seguridad para comparar
// la expresión disfrazada contra la limpia en varios valores de x) ----------

export function evaluar(nodo: Nodo, valores: Record<string, number>): number {
  switch (nodo.tipo) {
    case 'num':
      return nodo.valor
    case 'var': {
      const v = valores[nodo.nombre]
      if (v === undefined) throw new Error(`evaluar: falta el valor de "${nodo.nombre}"`)
      return v
    }
    case 'pow':
      return evaluar(nodo.base, valores) ** nodo.exponente
    case 'suma':
      return nodo.terminos.reduce((acc, t) => acc + evaluar(t, valores), 0)
    case 'prod':
      return nodo.factores.reduce((acc, f) => acc * evaluar(f, valores), 1)
    case 'grupo':
      return evaluar(nodo.expr, valores)
    case 'frac':
      return evaluar(nodo.numerador, valores) / evaluar(nodo.denominador, valores)
  }
}

// ---------- grado y coeficiente de un término suelto (no una 'suma') ----------
// Un "término" válido para estas funciones es num | var | pow(var,n) | frac
// (constante, no depende de x) | prod de esos. Se usan para leer/reescribir
// coeficientes por grado dentro de una 'suma' (ver lib/algebra/tecnicas/).
//
// gradoDeTermino devuelve `null` cuando el término contiene un factor 'grupo'
// (un sub-árbol ya disfrazado, opaco para esta clasificación simple) — quien
// llama debe tratar `null` como "no reclasificar, pero sigue siendo un
// término válido para técnicas que solo miran el coeficiente".

export function gradoDeTermino(t: Nodo): number | null {
  switch (t.tipo) {
    case 'num':
      return 0
    case 'var':
      return 1
    case 'pow':
      return t.exponente
    case 'frac':
      return 0
    case 'prod': {
      let total = 0
      for (const f of t.factores) {
        const g = gradoDeFactorEnProducto(f)
        if (g === null) return null
        total += g
      }
      return total
    }
    default:
      throw new Error(`gradoDeTermino: nodo "${t.tipo}" no es un término soportado (¿te faltó envolverlo en grupo()?)`)
  }
}

function gradoDeFactorEnProducto(f: Nodo): number | null {
  if (f.tipo === 'num') return 0
  if (f.tipo === 'var') return 1
  if (f.tipo === 'pow') return f.exponente
  if (f.tipo === 'frac') return 0
  if (f.tipo === 'grupo') return null
  throw new Error(`gradoDeTermino: factor "${f.tipo}" no soportado dentro de un producto`)
}

export function coeficienteDeTermino(t: Nodo): number {
  switch (t.tipo) {
    case 'num':
      return t.valor
    case 'var':
    case 'pow':
      return 1
    case 'frac':
      return evaluar(t, {}) // numerador/denominador constantes: no dependen de x
    case 'prod':
      return t.factores
        .filter((f) => f.tipo === 'num' || f.tipo === 'frac')
        .reduce((acc, f) => acc * coeficienteDeTermino(f), 1)
    default:
      throw new Error(`coeficienteDeTermino: nodo "${t.tipo}" no es un término soportado`)
  }
}

// ---------- renderer: Nodo -> string, mismas convenciones visuales que ya
// usa lib/plantillas.ts (signos con espacios " + "/" - ", superíndices
// unicode para exponentes, coeficiente 1/-1 sin numeral) ----------

const SUPERINDICES: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '-': '⁻',
}

function aSuperindice(valor: number): string {
  return String(valor).split('').map((c) => SUPERINDICES[c] ?? c).join('')
}

// ---------- jerarquía de símbolos de agrupación: (), luego [], luego {} ----------
//
// Convención matemática estándar: el nivel de agrupación MÁS INTERNO usa
// paréntesis, el siguiente hacia afuera corchetes, el siguiente llaves — y si
// se necesitan más de 3 niveles a lo largo de la MISMA cadena de anidado, se
// vuelve a empezar el ciclo en (). "frac" no consume un nivel propio (la
// barra de fracción ya delimita visualmente sin ambigüedad) pero sí se
// recorre para encontrar agrupaciones más adentro de su numerador/denominador.
const SIMBOLOS_AGRUPACION: [string, string][] = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
]

function envolver(cuerpo: string, profundidad: number): string {
  const [abre, cierra] = SIMBOLOS_AGRUPACION[profundidad % SIMBOLOS_AGRUPACION.length]
  return `${abre}${cuerpo}${cierra}`
}

// rangos (profundidad ya resuelta, no solo "distancia") de los envoltorios
// que quedan INMEDIATAMENTE adentro de `nodo` — el primer 'grupo' (o parte de
// fracción implícitamente envuelta) que se encuentra bajando por cada rama,
// sin seguir bajando más allá de él (lo que haya adentro de ESE envoltorio ya
// no es "inmediato" para quien pregunta, es asunto de ese envoltorio). Un
// wrapper nuevo no puede compartir símbolo con NINGUNO de estos — no alcanza
// con evitar solo el más profundo, porque dos ramas hermanas a profundidades
// distintas (una honda, una plana) pueden terminar chocando igual si solo se
// mira "profundidad máxima + 1" con ciclo módulo 3.
function rangosInmediatos(nodo: Nodo): number[] {
  switch (nodo.tipo) {
    case 'num':
    case 'var':
      return []
    case 'pow':
      return rangosInmediatos(nodo.base)
    case 'suma':
      return nodo.terminos.flatMap(rangosInmediatos)
    case 'prod':
      return nodo.factores.flatMap(rangosInmediatos)
    case 'grupo':
      return [rangoDeGrupo(nodo)]
    case 'frac':
      return [...rangosInmediatosParteFraccion(nodo.numerador), ...rangosInmediatosParteFraccion(nodo.denominador)]
  }
}

// numerador/denominador de una fracción: 'suma' y 'prod' con más de un factor
// reciben ahí un símbolo de agrupación EXTRA e implícito (ver
// renderFraccionParte) que no llevarían en cualquier otro contexto — para
// quien mira desde afuera, ESE envoltorio implícito es el límite inmediato,
// no hace falta seguir bajando. "frac" en sí no consume rango propio (la
// barra ya delimita sin ambigüedad) así que solo se filtra el caso especial.
function rangosInmediatosParteFraccion(nodo: Nodo): number[] {
  if (nodo.tipo === 'suma') return [elegirRango(nodo.terminos.flatMap(rangosInmediatos))]
  if (nodo.tipo === 'prod' && nodo.factores.length > 1) return [elegirRango(nodo.factores.flatMap(rangosInmediatos))]
  return rangosInmediatos(nodo)
}

function rangoDeGrupo(nodo: Extract<Nodo, { tipo: 'grupo' }>): number {
  return elegirRango(rangosInmediatos(nodo.expr))
}

// el rango elegido debe diferir (módulo 3) de TODOS los rangos inmediatos ya
// usados adentro — no solo ser "uno más que el máximo", porque ese +1 puede
// ciclar de vuelta a un símbolo que ya está usando una rama hermana más
// plana. Se busca el primer rango disponible a partir de max+1.
function elegirRango(inmediatos: number[]): number {
  const usados = new Set(inmediatos.map((r) => ((r % 3) + 3) % 3))
  let candidato = Math.max(-1, ...inmediatos) + 1
  let vueltas = 0
  while (usados.has(((candidato % 3) + 3) % 3) && vueltas < SIMBOLOS_AGRUPACION.length) {
    candidato++
    vueltas++
  }
  return candidato
}

function renderTermino(nodo: Nodo): { negativo: boolean; cuerpo: string } {
  switch (nodo.tipo) {
    case 'num':
      return { negativo: nodo.valor < 0, cuerpo: String(Math.abs(nodo.valor)) }
    case 'var':
      return { negativo: false, cuerpo: nodo.nombre }
    case 'pow': {
      if (nodo.base.tipo !== 'var') {
        throw new Error('renderTermino: "pow" solo soporta base variable en este renderer')
      }
      const nombre = nodo.base.nombre
      return { negativo: false, cuerpo: nodo.exponente === 1 ? nombre : `${nombre}${aSuperindice(nodo.exponente)}` }
    }
    case 'grupo':
      return { negativo: false, cuerpo: envolver(renderizar(nodo.expr), rangoDeGrupo(nodo)) }
    case 'frac': {
      const denParte = renderFraccionParte(nodo.denominador)
      const numParte = renderFraccionParte(nodo.numerador)
      return { negativo: numParte.negativo, cuerpo: `${numParte.cuerpo}/${denParte.cuerpo}` }
    }
    case 'prod': {
      let signoNegativo = false
      let coefNum = 1
      const partesNoNumericas: string[] = []
      for (const f of nodo.factores) {
        if (f.tipo === 'num') {
          coefNum *= f.valor
          continue
        }
        const { negativo, cuerpo } = renderTermino(f)
        if (negativo) signoNegativo = !signoNegativo
        partesNoNumericas.push(cuerpo)
      }
      const negativoCoef = coefNum < 0
      const negativo = negativoCoef !== signoNegativo // dos negativos se cancelan
      const abs = Math.abs(coefNum)
      const cuerpoVars = partesNoNumericas.join('')
      if (cuerpoVars === '') return { negativo, cuerpo: String(abs) }
      const coefTexto = abs === 1 ? '' : String(abs)
      return { negativo, cuerpo: `${coefTexto}${cuerpoVars}` }
    }
    case 'suma':
      throw new Error('renderTermino: una "suma" anidada debe envolverse con grupo() antes de usarse como término')
  }
}

// numerador/denominador de una fracción: si son compuestos (suma, o prod con
// más de un factor) se envuelven en paréntesis extra para que quede claro que
// TODO eso es una sola parte de la fracción, no solo el último factor
function renderFraccionParte(nodo: Nodo): { negativo: boolean; cuerpo: string } {
  if (nodo.tipo === 'suma') {
    const [rango] = rangosInmediatosParteFraccion(nodo)
    return { negativo: false, cuerpo: envolver(renderizarSuma(nodo.terminos), rango) }
  }
  if (nodo.tipo === 'prod' && nodo.factores.length > 1) {
    const { negativo, cuerpo } = renderTermino(nodo)
    const [rango] = rangosInmediatosParteFraccion(nodo)
    return { negativo, cuerpo: envolver(cuerpo, rango) }
  }
  return renderTermino(nodo)
}

function renderizarSuma(terminos: Nodo[]): string {
  if (terminos.length === 0) return '0'
  return terminos
    .map(renderTermino)
    .map((t, i) => {
      if (i === 0) return t.negativo ? `-${t.cuerpo}` : t.cuerpo
      return t.negativo ? ` - ${t.cuerpo}` : ` + ${t.cuerpo}`
    })
    .join('')
}

export function renderizar(nodo: Nodo): string {
  if (nodo.tipo === 'suma') return renderizarSuma(nodo.terminos)
  const { negativo, cuerpo } = renderTermino(nodo)
  return negativo ? `-${cuerpo}` : cuerpo
}
