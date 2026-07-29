import { Nodo, num, variable, potencia, suma, prod, renderizar } from './algebra/ast'
import { aplicarMezcla } from './algebra/mezcla'
import { rngPorDefecto } from './algebra/rng'

export type TipoPlantilla =
  | 'ecuacion_lineal'
  | 'sistema_2x2'
  | 'factorizacion_trinomio'
  | 'factor_comun'
  | 'regla_de_tres'
  | 'sistema_2x2_fracciones'
  | 'ecuacion_lineal_radical'
  | 'factorizacion_exponentes_negativos'
  | 'factorizacion_grado_3_4'
  | 'ecuacion_cuadratica'
  | 'limite_racional_directo'
  | 'limite_indeterminado'
  | 'derivada_polinomio'
  | 'derivada_racional'
  | 'derivada_potencias_negativas'
  | 'trig_identidad'
  | 'trig_ecuacion_simple'
  | 'trig_razones_triangulo'
  | 'limite_raiz'
  | 'factorizacion_trinomio_lider'
  | 'factorizacion_agrupacion'
  | 'factorizacion_suma_cubos'
  | 'factorizacion_diferencia_cubos'
  | 'factorizacion_combinada'

export interface GeneracionPlantilla {
  preguntaTexto: string
  valoresGenerados: Record<string, number>
  respuestaCorrecta:
    | string
    | { x: number; y: number }
    | { x1: number; x2: number }
    | { numerador: string; denominador: string }
  tolerancia: number
}

// ---------- utilidades numéricas ----------

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randIntNoCero(min: number, max: number): number {
  for (let i = 0; i < 200; i++) {
    const n = randInt(min, max)
    if (n !== 0) return n
  }
  throw new Error('Parámetros inválidos: el rango no permite un valor distinto de cero')
}

function randIntPositivo(min: number, max: number): number {
  const minPos = Math.max(1, Math.ceil(min))
  const maxPos = Math.max(minPos, Math.floor(max))
  return randInt(minPos, maxPos)
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

function requerido(parametros: Record<string, number>, clave: string): number {
  const valor = parametros?.[clave]
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    throw new Error(`Falta el parámetro "${clave}" para generar la pregunta`)
  }
  return valor
}

// ---------- formato de términos con signo ----------

function formatoPrimero(coef: number, variable: string): string {
  if (coef === 1) return variable
  if (coef === -1) return `-${variable}`
  return `${coef}${variable}`
}

// término siguiente dentro de una suma: " + 5x", " - 3", etc. variable='' para constantes
function formatoSiguiente(coef: number, variable: string): string {
  const signo = coef < 0 ? '-' : '+'
  const abs = Math.abs(coef)
  const coefTexto = variable && abs === 1 ? '' : String(abs)
  return ` ${signo} ${coefTexto}${variable}`
}

// factor lineal dentro de "(x+3)" / "(x-3)"
function formatoFactor(raiz: number): string {
  return raiz >= 0 ? `+${raiz}` : `${raiz}`
}

// como formatoSiguiente, pero sin espacios — para respuestas factorizadas
// tipo "(3x+2)(x-4)" en vez de "(3x + 2)(x - 4)" (mismo estilo que formatoFactor)
function formatoSiguienteTight(coef: number, variable: string): string {
  if (coef === 0) return ''
  const signo = coef < 0 ? '-' : '+'
  const abs = Math.abs(coef)
  const coefTexto = variable && abs === 1 ? '' : String(abs)
  return `${signo}${coefTexto}${variable}`
}

// factor lineal con coeficiente líder dentro de "(3x+2)" / "(x-4)" / "(-x+5)"
function formatoFactorLider(coef: number, constante: number): string {
  return `${formatoPrimero(coef, 'x')}${formatoSiguienteTight(constante, '')}`
}

// ---------- superíndices (exponentes de x) ----------

const SUPERINDICES: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '-': '⁻',
}

const SUPERINDICES_INVERSA: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
}

function aSuperindice(valor: number): string {
  return String(valor).split('').map((c) => SUPERINDICES[c] ?? c).join('')
}

// término "x^e" como factor completo: "x⁻²", "-x⁻²", "2x⁻³", o simplemente "x"/"-x" si e=1
function formatoTerminoPotencia(coef: number, exponente: number): string {
  const variable = exponente === 1 ? 'x' : `x${aSuperindice(exponente)}`
  if (coef === 1) return variable
  if (coef === -1) return `-${variable}`
  return `${coef}${variable}`
}

// término "x^e" siguiente dentro de una suma: " + 3x²", " - 5", etc. (exponente=0 para constantes)
function formatoSiguientePotencia(coef: number, exponente: number): string {
  const signo = coef < 0 ? '-' : '+'
  const abs = Math.abs(coef)
  const variable = exponente === 0 ? '' : exponente === 1 ? 'x' : `x${aSuperindice(exponente)}`
  const coefTexto = variable && abs === 1 ? '' : String(abs)
  return ` ${signo} ${coefTexto}${variable}`
}

// ---------- fracciones (coeficientes racionales) ----------

interface Fraccion {
  num: number
  den: number
}

function reducirFraccion(num: number, den: number): Fraccion {
  const g = gcd(num, den) || 1
  let n = num / g
  let d = den / g
  if (d < 0) {
    n = -n
    d = -d
  }
  return { num: n, den: d }
}

// genera una fracción reducida que NO colapsa a un entero (denominador siempre > 1)
function generarFraccionNoEntera(numMin: number, numMax: number, denMin: number, denMax: number): Fraccion {
  const denMinClamp = Math.max(2, Math.floor(denMin))
  const denMaxClamp = Math.max(denMinClamp, Math.floor(denMax))
  for (let i = 0; i < 200; i++) {
    const numRaw = randIntNoCero(numMin, numMax)
    const denRaw = randInt(denMinClamp, denMaxClamp)
    const f = reducirFraccion(numRaw, denRaw)
    if (f.den > 1) return f
  }
  throw new Error('Parámetros inválidos: no se pudo generar un coeficiente fraccionario (siempre se reduce a un entero)')
}

function formatoFraccionSimple(f: Fraccion): string {
  return f.den === 1 ? `${f.num}` : `${f.num}/${f.den}`
}

function formatoFraccionPrimero(f: Fraccion, variable: string): string {
  if (f.num === 1 && f.den === 1) return variable
  if (f.num === -1 && f.den === 1) return `-${variable}`
  return `${formatoFraccionSimple(f)}${variable}`
}

function formatoFraccionSiguiente(f: Fraccion, variable: string): string {
  const signo = f.num < 0 ? '-' : '+'
  const abs: Fraccion = { num: Math.abs(f.num), den: f.den }
  return ` ${signo} ${formatoFraccionSimple(abs)}${variable}`
}

// determinante de un sistema con coeficientes fraccionarios, con aritmética entera exacta
// (evita imprecisión de floats al decidir si es cero)
function determinanteFraccionesEsCero(a1: Fraccion, b1: Fraccion, a2: Fraccion, b2: Fraccion): boolean {
  const izquierda = a1.num * b2.num * a2.den * b1.den
  const derecha = a2.num * b1.num * a1.den * b2.den
  return izquierda === derecha
}

function combinacionFraccion(a: Fraccion, x: number, b: Fraccion, y: number): Fraccion {
  const numComun = a.num * x * b.den + b.num * y * a.den
  const denComun = a.den * b.den
  return reducirFraccion(numComun, denComun)
}

// ---------- radicales ----------

function esLibreDeCuadrados(n: number): boolean {
  for (let d = 2; d * d <= n; d++) {
    if (n % (d * d) === 0) return false
  }
  return true
}

// simplifica √m al mayor entero k tal que m = k²·n, devolviendo (k, n) con n libre de cuadrados
function simplificarRadical(m: number): { coef: number; radicando: number } {
  for (let d = Math.floor(Math.sqrt(m)); d >= 1; d--) {
    if (m % (d * d) === 0) {
      return { coef: d, radicando: m / (d * d) }
    }
  }
  return { coef: 1, radicando: m }
}

function formatoRadical(coef: number, radicando: number): string {
  const cuerpo = `√${radicando}`
  if (coef === 1) return cuerpo
  if (coef === -1) return `-${cuerpo}`
  return `${coef}${cuerpo}`
}

// ---------- generadores ----------

function generarEcuacionLineal(parametros: Record<string, number>): GeneracionPlantilla {
  const a = randIntNoCero(requerido(parametros, 'a_min'), requerido(parametros, 'a_max'))
  const b = randInt(requerido(parametros, 'b_min'), requerido(parametros, 'b_max'))
  const x = randInt(requerido(parametros, 'x_min'), requerido(parametros, 'x_max'))
  const c = a * x + b

  const terminoB = b === 0 ? '' : formatoSiguiente(b, '')
  const preguntaTexto = `Resuelve: ${formatoPrimero(a, 'x')}${terminoB} = ${c}`

  return {
    preguntaTexto,
    valoresGenerados: { a, b, c, x },
    respuestaCorrecta: String(x),
    tolerancia: 0,
  }
}

function filaCoeficientesValida(
  aMin: number, aMax: number, bMin: number, bMax: number
): [number, number] {
  for (let i = 0; i < 200; i++) {
    const a = randInt(aMin, aMax)
    const b = randInt(bMin, bMax)
    if (a !== 0 || b !== 0) return [a, b]
  }
  throw new Error('Parámetros inválidos: no se puede generar una fila de coeficientes no nula')
}

function generarSistema2x2(parametros: Record<string, number>): GeneracionPlantilla {
  const aMin = requerido(parametros, 'a_min'), aMax = requerido(parametros, 'a_max')
  const bMin = requerido(parametros, 'b_min'), bMax = requerido(parametros, 'b_max')
  const x = randInt(requerido(parametros, 'x_min'), requerido(parametros, 'x_max'))
  const y = randInt(requerido(parametros, 'y_min'), requerido(parametros, 'y_max'))

  const [a1, b1] = filaCoeficientesValida(aMin, aMax, bMin, bMax)

  let a2 = 0, b2 = 0
  let encontrada = false
  for (let i = 0; i < 200; i++) {
    ;[a2, b2] = filaCoeficientesValida(aMin, aMax, bMin, bMax)
    if (a1 * b2 - a2 * b1 !== 0) {
      encontrada = true
      break
    }
  }
  if (!encontrada) {
    throw new Error('Parámetros inválidos: no se pudo generar un sistema con solución única')
  }

  const c1 = a1 * x + b1 * y
  const c2 = a2 * x + b2 * y

  const ecuacion = (a: number, b: number, c: number) =>
    `${formatoPrimero(a, 'x')}${b === 0 ? '' : formatoSiguiente(b, 'y')} = ${c}`

  const preguntaTexto = `${ecuacion(a1, b1, c1)}\n${ecuacion(a2, b2, c2)}`

  return {
    preguntaTexto,
    valoresGenerados: { a1, b1, c1, a2, b2, c2, x, y },
    respuestaCorrecta: { x, y },
    tolerancia: 0,
  }
}

function generarSistema2x2Fracciones(parametros: Record<string, number>): GeneracionPlantilla {
  const numMin = requerido(parametros, 'num_min'), numMax = requerido(parametros, 'num_max')
  const denMin = requerido(parametros, 'den_min'), denMax = requerido(parametros, 'den_max')
  const x = randInt(requerido(parametros, 'x_min'), requerido(parametros, 'x_max'))
  const y = randInt(requerido(parametros, 'y_min'), requerido(parametros, 'y_max'))

  const a1 = generarFraccionNoEntera(numMin, numMax, denMin, denMax)
  const b1 = generarFraccionNoEntera(numMin, numMax, denMin, denMax)

  let a2: Fraccion = a1
  let b2: Fraccion = b1
  let encontrada = false
  for (let i = 0; i < 200; i++) {
    a2 = generarFraccionNoEntera(numMin, numMax, denMin, denMax)
    b2 = generarFraccionNoEntera(numMin, numMax, denMin, denMax)
    if (!determinanteFraccionesEsCero(a1, b1, a2, b2)) {
      encontrada = true
      break
    }
  }
  if (!encontrada) {
    throw new Error('Parámetros inválidos: no se pudo generar un sistema fraccionario con solución única')
  }

  const c1 = combinacionFraccion(a1, x, b1, y)
  const c2 = combinacionFraccion(a2, x, b2, y)

  const ecuacion = (a: Fraccion, b: Fraccion, c: Fraccion) =>
    `${formatoFraccionPrimero(a, 'x')}${formatoFraccionSiguiente(b, 'y')} = ${formatoFraccionSimple(c)}`

  const preguntaTexto = `${ecuacion(a1, b1, c1)}\n${ecuacion(a2, b2, c2)}`

  return {
    preguntaTexto,
    valoresGenerados: {
      a1_num: a1.num, a1_den: a1.den, b1_num: b1.num, b1_den: b1.den,
      a2_num: a2.num, a2_den: a2.den, b2_num: b2.num, b2_den: b2.den,
      x, y,
    },
    respuestaCorrecta: { x, y },
    tolerancia: 0,
  }
}

function generarEcuacionLinealRadical(parametros: Record<string, number>): GeneracionPlantilla {
  const a = randIntPositivo(requerido(parametros, 'a_min'), requerido(parametros, 'a_max'))
  const k = randIntPositivo(requerido(parametros, 'k_min'), requerido(parametros, 'k_max'))
  const nMin = requerido(parametros, 'n_min')
  const nMax = requerido(parametros, 'n_max')

  let n = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    n = randInt(Math.max(2, Math.ceil(nMin)), Math.max(2, Math.floor(nMax)))
    if (n > 1 && esLibreDeCuadrados(n)) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se encontró un radicando libre de cuadrados en el rango dado')
  }

  const m = (a * k) ** 2 * n
  const simplificado = simplificarRadical(m)

  const preguntaTexto = `Resuelve: ${formatoPrimero(a, 'x')} = √${m}`
  const respuestaCorrecta = formatoRadical(simplificado.coef, simplificado.radicando)

  return {
    preguntaTexto,
    valoresGenerados: { a, k, n, m },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

// construye a·x² + b·x + c como Nodo (omitiendo términos con coeficiente 0) —
// compartido por factorizacion_trinomio, factorizacion_trinomio_lider y
// factorizacion_combinada
function construirTrinomioNodo(a: number, b: number, c: number): Nodo {
  const terminos: Nodo[] = [prod([num(a), potencia(variable('x'), 2)])]
  if (b !== 0) terminos.push(prod([num(b), variable('x')]))
  if (c !== 0) terminos.push(num(c))
  return suma(terminos)
}

function generarFactorizacionTrinomio(parametros: Record<string, number>): GeneracionPlantilla {
  const pMin = requerido(parametros, 'p_min'), pMax = requerido(parametros, 'p_max')
  const qMin = requerido(parametros, 'q_min'), qMax = requerido(parametros, 'q_max')

  let p = 0, q = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    p = randInt(pMin, pMax)
    q = randInt(qMin, qMax)
    if (p !== 0 && q !== 0) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudieron generar raíces no nulas para el trinomio')
  }

  const b = p + q
  const c = p * q

  // el enunciado se arma como AST (no string directo) para poder pasar por
  // el pipeline de disfraz de lib/algebra/ manteniendo la respuesta limpia
  const nodoLimpio = construirTrinomioNodo(1, b, c)
  const { nodo: nodoDisfrazado } = aplicarMezcla(nodoLimpio, rngPorDefecto)
  const preguntaTexto = `Factoriza: ${renderizar(nodoDisfrazado)}`

  // p === q: trinomio cuadrado perfecto. Se guarda como (x±p)²; el normalizador
  // acepta también (x±p)(x±p) como equivalente (ver normalizarTextoAlgebraico).
  const respuestaCorrecta =
    p === q
      ? `(x${formatoFactor(p)})²`
      : `(x${formatoFactor(p)})(x${formatoFactor(q)})`

  return {
    preguntaTexto,
    valoresGenerados: { p, q, b, c },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

function generarFactorComun(parametros: Record<string, number>): GeneracionPlantilla {
  const aMin = requerido(parametros, 'a_min'), aMax = requerido(parametros, 'a_max')
  const bMin = requerido(parametros, 'b_min'), bMax = requerido(parametros, 'b_max')

  let a = 0, b = 0, g = 1
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    a = randIntNoCero(aMin, aMax)
    b = randIntNoCero(bMin, bMax)
    g = gcd(a, b)
    if (g > 1) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudo generar un binomio con factor común mayor a 1')
  }

  const m = a / g
  const n = b / g

  const preguntaTexto = `Factoriza: ${formatoPrimero(a, 'x')}${formatoSiguiente(b, '')}`
  const factorInterno = `${formatoPrimero(m, 'x')}${formatoSiguiente(n, '')}`
  const respuestaCorrecta = `${g}(${factorInterno})`

  return {
    preguntaTexto,
    valoresGenerados: { a, b, g, m, n },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

function generarFactorizacionExponentesNegativos(parametros: Record<string, number>): GeneracionPlantilla {
  const expMin = requerido(parametros, 'exp_min')
  const expMax = requerido(parametros, 'exp_max')
  const coefMin = requerido(parametros, 'coef_min')
  const coefMax = requerido(parametros, 'coef_max')

  let e1 = 0, e2 = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    const exp1 = randInt(expMin, expMax)
    const exp2 = randInt(expMin, expMax)
    if (exp1 !== exp2) {
      e1 = Math.min(exp1, exp2)
      e2 = Math.max(exp1, exp2)
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudieron generar dos exponentes distintos')
  }

  const c1 = randIntNoCero(coefMin, coefMax)
  const c2 = randIntNoCero(coefMin, coefMax)
  const g = gcd(c1, c2)

  const m = c1 / g
  const n = c2 / g
  const expInterno = e2 - e1

  const preguntaTexto = `Factoriza: ${formatoTerminoPotencia(c1, e1)}${formatoSiguientePotencia(c2, e2)}`

  const factorComun = formatoTerminoPotencia(g, e1)
  const terminoConstante = m === 1 ? '1' : m === -1 ? '-1' : String(m)
  const factorInterno = `${terminoConstante}${formatoSiguientePotencia(n, expInterno)}`
  const respuestaCorrecta = `${factorComun}(${factorInterno})`

  return {
    preguntaTexto,
    valoresGenerados: { c1, c2, e1, e2, g },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

function generarFactorizacionGrado34(parametros: Record<string, number>): GeneracionPlantilla {
  const grado = requerido(parametros, 'grado')
  if (grado !== 3 && grado !== 4) {
    throw new Error('El parámetro "grado" debe ser 3 o 4')
  }

  const raizMin = requerido(parametros, 'raiz_min')
  const raizMax = requerido(parametros, 'raiz_max')

  const raices: number[] = []
  for (let i = 0; i < grado; i++) {
    let raiz = 0
    let intento = 0
    do {
      raiz = randIntNoCero(raizMin, raizMax)
      intento++
      if (intento > 200) {
        throw new Error('Parámetros inválidos: no se pudieron generar suficientes raíces distintas y no nulas')
      }
    } while (raices.includes(raiz))
    raices.push(raiz)
  }

  // expandir (x-r1)(x-r2)...(x-rN) como array de coeficientes, de mayor a menor grado
  let coeficientes = [1]
  for (const r of raices) {
    const nuevos = new Array(coeficientes.length + 1).fill(0)
    for (let i = 0; i < coeficientes.length; i++) {
      nuevos[i] += coeficientes[i]
      nuevos[i + 1] += coeficientes[i] * -r
    }
    coeficientes = nuevos
  }

  const partes: string[] = [formatoTerminoPotencia(coeficientes[0], grado)]
  for (let i = 1; i < coeficientes.length; i++) {
    if (coeficientes[i] === 0) continue
    const exponente = grado - i
    partes.push(formatoSiguientePotencia(coeficientes[i], exponente))
  }
  const preguntaTexto = `Factoriza: ${partes.join('')}`

  const respuestaCorrecta = raices.map((r) => `(x${formatoFactor(-r)})`).join('')

  return {
    preguntaTexto,
    valoresGenerados: Object.fromEntries(raices.map((r, i) => [`raiz${i + 1}`, r])),
    respuestaCorrecta,
    tolerancia: 0,
  }
}

// ---------- factorización: casos nuevos (líder, agrupación, cubos, combinado) ----------

function generarFactorizacionTrinomioLider(parametros: Record<string, number>): GeneracionPlantilla {
  const pMin = requerido(parametros, 'p_min'), pMax = requerido(parametros, 'p_max')
  const qMin = requerido(parametros, 'q_min'), qMax = requerido(parametros, 'q_max')
  const rMin = requerido(parametros, 'r_min'), rMax = requerido(parametros, 'r_max')
  const sMin = requerido(parametros, 's_min'), sMax = requerido(parametros, 's_max')

  let p = 0, q = 0, r = 0, s = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    p = randIntNoCero(pMin, pMax)
    q = randIntNoCero(qMin, qMax)
    r = randIntNoCero(rMin, rMax)
    s = randIntNoCero(sMin, sMax)
    // |p·r| > 1: que el líder sea genuinamente distinto de 1 (si no, es el
    // caso monic ya cubierto por factorizacion_trinomio)
    if (Math.abs(p * r) > 1) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudieron generar coeficientes líderes p,r con |p·r| > 1')
  }

  const a = p * r
  const b = p * s + q * r
  const c = q * s

  const nodoLimpio = construirTrinomioNodo(a, b, c)
  const { nodo: nodoDisfrazado } = aplicarMezcla(nodoLimpio, rngPorDefecto)
  const preguntaTexto = `Factoriza: ${renderizar(nodoDisfrazado)}`

  const respuestaCorrecta = `(${formatoFactorLider(p, q)})(${formatoFactorLider(r, s)})`

  return {
    preguntaTexto,
    valoresGenerados: { p, q, r, s, a, b, c },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

function generarFactorizacionAgrupacion(parametros: Record<string, number>): GeneracionPlantilla {
  const pMin = requerido(parametros, 'p_min'), pMax = requerido(parametros, 'p_max')
  const qMin = requerido(parametros, 'q_min'), qMax = requerido(parametros, 'q_max')
  const rMin = requerido(parametros, 'r_min'), rMax = requerido(parametros, 'r_max')
  const sMin = requerido(parametros, 's_min'), sMax = requerido(parametros, 's_max')

  let p = 0, q = 0, r = 0, s = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    p = randIntNoCero(pMin, pMax)
    q = randIntNoCero(qMin, qMax)
    r = randIntNoCero(rMin, rMax)
    s = randIntNoCero(sMin, sMax)
    if (Math.abs(p * r) > 1) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudieron generar coeficientes líderes p,r con |p·r| > 1')
  }

  const a = p * r
  const c = q * s
  // split determinístico (NO el split al azar de la técnica de disfraz
  // "agrupacion" — ver diseño): con {p·s, q·r} agrupar en pares SIEMPRE
  // produce factores comunes reales, porque viene directo de la factorización.
  const terminoPS = p * s
  const terminoQR = q * r

  // 4 términos sin combinar, a propósito SIN pasar por aplicarMezcla: el
  // enunciado en sí es la estructura pedagógica (lista para agrupar de a 2)
  // y disfrazarla encima taparía esa señal.
  const nodoEnunciado = suma([
    prod([num(a), potencia(variable('x'), 2)]),
    prod([num(terminoPS), variable('x')]),
    prod([num(terminoQR), variable('x')]),
    num(c),
  ])
  const preguntaTexto = `Factoriza agrupando: ${renderizar(nodoEnunciado)}`

  const respuestaCorrecta = `(${formatoFactorLider(p, q)})(${formatoFactorLider(r, s)})`

  return {
    preguntaTexto,
    valoresGenerados: { p, q, r, s, a, c, terminoPS, terminoQR },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

// a³+b³=(a+b)(a²-ab+b²) si signo=1 (suma); a³-b³=(a-b)(a²+ab+b²) si signo=-1
// (diferencia), con a=kx, b=m. El target limpio k³x³ ± m³ ya nace de 2
// términos (la identidad cancela los de grado 2 y 1 solita) — el mejor
// candidato de las 5 plantillas nuevas para el pipeline de disfraz.
function generarFactorizacionCubos(parametros: Record<string, number>, signo: 1 | -1): GeneracionPlantilla {
  const kMin = requerido(parametros, 'k_min'), kMax = requerido(parametros, 'k_max')
  const mMin = requerido(parametros, 'm_min'), mMax = requerido(parametros, 'm_max')

  const k = randIntNoCero(kMin, kMax)
  const m = randIntNoCero(mMin, mMax)

  const k3 = k * k * k
  const m3 = m * m * m

  const nodoLimpio = suma([prod([num(k3), potencia(variable('x'), 3)]), num(signo * m3)])
  const { nodo: nodoDisfrazado } = aplicarMezcla(nodoLimpio, rngPorDefecto)
  const preguntaTexto = `Factoriza: ${renderizar(nodoDisfrazado)}`

  const primerFactor = `(${formatoFactorLider(k, signo * m)})`
  const segundoFactor = `(${formatoPrimero(k * k, 'x²')}${formatoSiguienteTight(-signo * k * m, 'x')}${formatoSiguienteTight(m * m, '')})`
  const respuestaCorrecta = `${primerFactor}${segundoFactor}`

  return {
    preguntaTexto,
    valoresGenerados: { k, m, k3, m3 },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

function generarFactorizacionSumaCubos(parametros: Record<string, number>): GeneracionPlantilla {
  return generarFactorizacionCubos(parametros, 1)
}

function generarFactorizacionDiferenciaCubos(parametros: Record<string, number>): GeneracionPlantilla {
  return generarFactorizacionCubos(parametros, -1)
}

// encadena 2 o 3 pasos al azar: factor común (g) + trinomio simple (2 pasos)
// o factor común (g) + trinomio con coeficiente líder (3 pasos, ya que ese
// último paso en sí requiere agrupación/AC-method). Reutiliza exactamente la
// misma construcción de seed que factorizacion_trinomio y
// factorizacion_trinomio_lider, solo escalada por g.
function generarFactorizacionCombinada(parametros: Record<string, number>): GeneracionPlantilla {
  const gMin = requerido(parametros, 'g_min'), gMax = requerido(parametros, 'g_max')
  const pMin = requerido(parametros, 'p_min'), pMax = requerido(parametros, 'p_max')
  const qMin = requerido(parametros, 'q_min'), qMax = requerido(parametros, 'q_max')
  const rMin = requerido(parametros, 'r_min'), rMax = requerido(parametros, 'r_max')
  const sMin = requerido(parametros, 's_min'), sMax = requerido(parametros, 's_max')

  let g = 0
  let encontradoG = false
  for (let i = 0; i < 200; i++) {
    g = randIntNoCero(gMin, gMax)
    if (Math.abs(g) > 1) {
      encontradoG = true
      break
    }
  }
  if (!encontradoG) {
    throw new Error('Parámetros inválidos: no se pudo generar un factor común |g| > 1')
  }

  const tresPasos = randInt(0, 1) === 1

  let aInner: number
  let bInner: number
  let cInner: number
  let respuestaCorrecta: string
  let valoresGenerados: Record<string, number>

  if (tresPasos) {
    let p = 0, q = 0, r = 0, s = 0
    let encontrado = false
    for (let i = 0; i < 200; i++) {
      p = randIntNoCero(pMin, pMax)
      q = randIntNoCero(qMin, qMax)
      r = randIntNoCero(rMin, rMax)
      s = randIntNoCero(sMin, sMax)
      if (Math.abs(p * r) > 1) {
        encontrado = true
        break
      }
    }
    if (!encontrado) {
      throw new Error('Parámetros inválidos: no se pudieron generar coeficientes líderes p,r con |p·r| > 1')
    }
    aInner = p * r
    bInner = p * s + q * r
    cInner = q * s
    respuestaCorrecta = `${g}(${formatoFactorLider(p, q)})(${formatoFactorLider(r, s)})`
    valoresGenerados = { g, p, q, r, s, tresPasos: 1 }
  } else {
    let p = 0, q = 0
    let encontrado = false
    for (let i = 0; i < 200; i++) {
      p = randIntNoCero(pMin, pMax)
      q = randIntNoCero(qMin, qMax)
      if (p !== q) {
        encontrado = true
        break
      }
    }
    if (!encontrado) {
      throw new Error('Parámetros inválidos: no se pudieron generar raíces distintas p,q')
    }
    aInner = 1
    bInner = p + q
    cInner = p * q
    respuestaCorrecta = `${g}(x${formatoFactor(p)})(x${formatoFactor(q)})`
    valoresGenerados = { g, p, q, tresPasos: 0 }
  }

  const a = g * aInner
  const b = g * bInner
  const c = g * cInner

  const nodoLimpio = construirTrinomioNodo(a, b, c)
  const { nodo: nodoDisfrazado } = aplicarMezcla(nodoLimpio, rngPorDefecto)
  const preguntaTexto = `Factoriza: ${renderizar(nodoDisfrazado)}`

  return {
    preguntaTexto,
    valoresGenerados: { ...valoresGenerados, a, b, c },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

function generarEcuacionCuadratica(parametros: Record<string, number>): GeneracionPlantilla {
  const aMin = requerido(parametros, 'a_min'), aMax = requerido(parametros, 'a_max')
  const rMin = requerido(parametros, 'r_min'), rMax = requerido(parametros, 'r_max')

  const a = randIntNoCero(aMin, aMax)
  const r1 = randIntNoCero(rMin, rMax)
  const r2 = randIntNoCero(rMin, rMax)

  // a·(x-r1)(x-r2) = a·x² - a(r1+r2)x + a·r1·r2 — el discriminante de esta
  // forma es siempre a²(r1-r2)², un cuadrado perfecto por construcción.
  const b = -a * (r1 + r2)
  const c = a * r1 * r2

  const terminoB = b === 0 ? '' : formatoSiguientePotencia(b, 1)
  const terminoC = c === 0 ? '' : formatoSiguientePotencia(c, 0)
  const preguntaTexto = `Resuelve: ${formatoTerminoPotencia(a, 2)}${terminoB}${terminoC} = 0`

  return {
    preguntaTexto,
    valoresGenerados: { a, b, c, r1, r2 },
    respuestaCorrecta: { x1: r1, x2: r2 },
    tolerancia: 0,
  }
}

function generarLimiteRacionalDirecto(parametros: Record<string, number>): GeneracionPlantilla {
  const aMin = requerido(parametros, 'a_min'), aMax = requerido(parametros, 'a_max')
  const bMin = requerido(parametros, 'b_min'), bMax = requerido(parametros, 'b_max')
  const cMin = requerido(parametros, 'c_min'), cMax = requerido(parametros, 'c_max')
  const dMin = requerido(parametros, 'd_min'), dMax = requerido(parametros, 'd_max')
  const x0Min = requerido(parametros, 'x0_min'), x0Max = requerido(parametros, 'x0_max')

  const a = randIntNoCero(aMin, aMax)
  const b = randInt(bMin, bMax)

  let c = 0, d = 0, x0 = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    c = randIntNoCero(cMin, cMax)
    d = randInt(dMin, dMax)
    x0 = randInt(x0Min, x0Max)
    if (c * x0 + d !== 0) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudo generar un denominador que no se anule en x0')
  }

  const resultado = reducirFraccion(a * x0 + b, c * x0 + d)

  const terminoB = b === 0 ? '' : formatoSiguiente(b, '')
  const terminoD = d === 0 ? '' : formatoSiguiente(d, '')
  const preguntaTexto = `Calcula: lim(x→${x0}) (${formatoPrimero(a, 'x')}${terminoB})/(${formatoPrimero(c, 'x')}${terminoD})`

  return {
    preguntaTexto,
    valoresGenerados: { a, b, c, d, x0 },
    respuestaCorrecta: formatoFraccionSimple(resultado),
    tolerancia: 0.001,
  }
}

function generarLimiteIndeterminado(parametros: Record<string, number>): GeneracionPlantilla {
  const x0 = randInt(requerido(parametros, 'x0_min'), requerido(parametros, 'x0_max'))
  const rNum = randInt(requerido(parametros, 'r_num_min'), requerido(parametros, 'r_num_max'))
  const rDenMin = requerido(parametros, 'r_den_min')
  const rDenMax = requerido(parametros, 'r_den_max')

  let rDen = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    rDen = randInt(rDenMin, rDenMax)
    if (rDen !== x0 && rDen !== rNum) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudo generar una segunda raíz de denominador distinta de x0 y de la raíz del numerador')
  }

  // numerador = (x-x0)(x-rNum), denominador = (x-x0)(x-rDen): comparten la
  // raíz x0 (0/0 al sustituir); tras cancelar (x-x0) queda (x0-rNum)/(x0-rDen).
  const bNum = -(x0 + rNum)
  const cNum = x0 * rNum
  const bDen = -(x0 + rDen)
  const cDen = x0 * rDen

  const terminoCuadratico = (b: number, c: number) =>
    `${formatoTerminoPotencia(1, 2)}${b === 0 ? '' : formatoSiguientePotencia(b, 1)}${c === 0 ? '' : formatoSiguientePotencia(c, 0)}`

  const preguntaTexto = `Calcula: lim(x→${x0}) (${terminoCuadratico(bNum, cNum)})/(${terminoCuadratico(bDen, cDen)})`

  const resultado = reducirFraccion(x0 - rNum, x0 - rDen)

  return {
    preguntaTexto,
    valoresGenerados: { x0, r_num: rNum, r_den: rDen },
    respuestaCorrecta: formatoFraccionSimple(resultado),
    tolerancia: 0.001,
  }
}

function generarDerivadaPolinomio(parametros: Record<string, number>): GeneracionPlantilla {
  const grado = requerido(parametros, 'grado')
  if (grado !== 2 && grado !== 3 && grado !== 4) {
    throw new Error('El parámetro "grado" debe ser 2, 3 o 4')
  }

  const coefMin = requerido(parametros, 'coef_min')
  const coefMax = requerido(parametros, 'coef_max')

  // coeficientes[e] = coeficiente del término x^e; el líder no puede ser 0
  // (si no, el grado real sería menor al pedido)
  const coeficientes: number[] = new Array(grado + 1).fill(0)
  coeficientes[grado] = randIntNoCero(coefMin, coefMax)
  for (let e = grado - 1; e >= 0; e--) {
    coeficientes[e] = randInt(coefMin, coefMax)
  }

  const partesPregunta: string[] = [formatoTerminoPotencia(coeficientes[grado], grado)]
  for (let e = grado - 1; e >= 0; e--) {
    if (coeficientes[e] === 0) continue
    partesPregunta.push(formatoSiguientePotencia(coeficientes[e], e))
  }
  const preguntaTexto = `Deriva: f(x) = ${partesPregunta.join('')}`

  // regla de potencia término a término: d/dx[a·x^e] = e·a·x^(e-1); el término
  // independiente (e=0) se anula y no aparece en la derivada
  const gradoDerivada = grado - 1
  const derivCoef: number[] = new Array(gradoDerivada + 1).fill(0)
  for (let e = 1; e <= grado; e++) {
    derivCoef[e - 1] = e * coeficientes[e]
  }

  const partesRespuesta: string[] = [formatoTerminoPotencia(derivCoef[gradoDerivada], gradoDerivada)]
  for (let e = gradoDerivada - 1; e >= 0; e--) {
    if (derivCoef[e] === 0) continue
    partesRespuesta.push(formatoSiguientePotencia(derivCoef[e], e))
  }
  const respuestaCorrecta = partesRespuesta.join('')

  return {
    preguntaTexto,
    valoresGenerados: Object.fromEntries(coeficientes.map((c, e) => [`coef${e}`, c])),
    respuestaCorrecta,
    tolerancia: 0,
  }
}

function generarDerivadaRacional(parametros: Record<string, number>): GeneracionPlantilla {
  const aMin = requerido(parametros, 'a_min'), aMax = requerido(parametros, 'a_max')
  const bMin = requerido(parametros, 'b_min'), bMax = requerido(parametros, 'b_max')
  const cMin = requerido(parametros, 'c_min'), cMax = requerido(parametros, 'c_max')
  const dMin = requerido(parametros, 'd_min'), dMax = requerido(parametros, 'd_max')

  // f(x) = (ax+b)/(cx+d) -> f'(x) = [a(cx+d) - c(ax+b)]/(cx+d)² = (ad-bc)/(cx+d)²
  // (los términos en x se cancelan siempre). Se evita ad-bc=0 (derivada
  // idénticamente nula, un caso degenerado y confuso como ejercicio) y c=0
  // (el denominador dejaría de depender de x, no ejercitaría la regla del cociente)
  let a = 0, b = 0, c = 0, d = 0, k = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    a = randIntNoCero(aMin, aMax)
    b = randInt(bMin, bMax)
    c = randIntNoCero(cMin, cMax)
    d = randInt(dMin, dMax)
    k = a * d - b * c
    if (k !== 0) {
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudo generar una función racional cuya derivada no se anule (ad - bc ≠ 0)')
  }

  const terminoB = b === 0 ? '' : formatoSiguiente(b, '')
  const terminoD = d === 0 ? '' : formatoSiguiente(d, '')
  const preguntaTexto = `Deriva: f(x) = (${formatoPrimero(a, 'x')}${terminoB})/(${formatoPrimero(c, 'x')}${terminoD})`

  const denominador = `(${formatoPrimero(c, 'x')}${terminoD})²`

  return {
    preguntaTexto,
    valoresGenerados: { a, b, c, d, k },
    respuestaCorrecta: { numerador: String(k), denominador },
    tolerancia: 0,
  }
}

function generarDerivadaPotenciasNegativas(parametros: Record<string, number>): GeneracionPlantilla {
  const expMin = requerido(parametros, 'exp_min')
  const expMax = requerido(parametros, 'exp_max')
  const coefMin = requerido(parametros, 'coef_min')
  const coefMax = requerido(parametros, 'coef_max')

  let e1 = 0, e2 = 0
  let encontrado = false
  for (let i = 0; i < 200; i++) {
    const exp1 = randInt(expMin, expMax)
    const exp2 = randInt(expMin, expMax)
    if (exp1 !== exp2) {
      e1 = Math.min(exp1, exp2)
      e2 = Math.max(exp1, exp2)
      encontrado = true
      break
    }
  }
  if (!encontrado) {
    throw new Error('Parámetros inválidos: no se pudieron generar dos exponentes distintos')
  }

  const c1 = randIntNoCero(coefMin, coefMax)
  const c2 = randIntNoCero(coefMin, coefMax)

  const preguntaTexto = `Deriva: f(x) = ${formatoTerminoPotencia(c1, e1)}${formatoSiguientePotencia(c2, e2)}`

  // misma regla de potencia que con exponentes positivos: d/dx[c·x^e] = e·c·x^(e-1).
  // e1 != e2 garantiza e1-1 != e2-1, así que los términos derivados no colapsan
  const d1 = e1 * c1
  const d2 = e2 * c2
  const respuestaCorrecta = `${formatoTerminoPotencia(d1, e1 - 1)}${formatoSiguientePotencia(d2, e2 - 1)}`

  return {
    preguntaTexto,
    valoresGenerados: { c1, c2, e1, e2 },
    respuestaCorrecta,
    tolerancia: 0,
  }
}

// ---------- ternas pitagóricas (compartidas por trig_identidad y trig_razones_triangulo) ----------

const TERNAS_PITAGORICAS_PRIMITIVAS: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
  [12, 35, 37],
]

interface TernaPitagorica {
  a: number
  b: number
  c: number
}

// terna primitiva escalada por un entero (preserva a²+b²=c²)
function generarTernaPitagorica(escalaMax: number): TernaPitagorica {
  const [a, b, c] = TERNAS_PITAGORICAS_PRIMITIVAS[randInt(0, TERNAS_PITAGORICAS_PRIMITIVAS.length - 1)]
  const escala = randInt(1, Math.max(1, escalaMax))
  return { a: a * escala, b: b * escala, c: c * escala }
}

// devuelve (opuesto, adyacente, hipotenusa) para un ángulo elegido al azar entre
// los dos vértices agudos de la terna
function catetosAlAzar(terna: TernaPitagorica): { op: number; ady: number; hip: number } {
  const invertir = Math.random() < 0.5
  return {
    op: invertir ? terna.b : terna.a,
    ady: invertir ? terna.a : terna.b,
    hip: terna.c,
  }
}

// ---------- trig_identidad ----------

type VarianteTrigIdentidad =
  | 'pitagorica_sencos'
  | 'pitagorica_tansec'
  | 'pitagorica_cotcsc'
  | 'angulo_doble_sen'
  | 'angulo_doble_cos'
  | 'suma_sen'

const VARIANTES_TRIG_IDENTIDAD: VarianteTrigIdentidad[] = [
  'pitagorica_sencos', 'pitagorica_tansec', 'pitagorica_cotcsc',
  'angulo_doble_sen', 'angulo_doble_cos', 'suma_sen',
]

function generarTrigIdentidad(parametros: Record<string, number>): GeneracionPlantilla {
  const kMin = requerido(parametros, 'k_min')
  const kMax = requerido(parametros, 'k_max')
  const escalaMax = requerido(parametros, 'escala_max')

  const variante = VARIANTES_TRIG_IDENTIDAD[randInt(0, VARIANTES_TRIG_IDENTIDAD.length - 1)]

  // identidades pitagóricas: k·(identidad) = k, sin depender de x
  if (variante === 'pitagorica_sencos' || variante === 'pitagorica_tansec' || variante === 'pitagorica_cotcsc') {
    const k = randIntNoCero(kMin, kMax)
    const factorTexto = k === 1 ? '' : k === -1 ? '-' : String(k)
    const identidadTexto =
      variante === 'pitagorica_sencos' ? 'sen²(x) + cos²(x)'
        : variante === 'pitagorica_tansec' ? 'sec²(x) - tan²(x)'
          : 'csc²(x) - cot²(x)'
    const preguntaTexto = `Simplifica usando identidades trigonométricas: ${factorTexto}(${identidadTexto})`

    return {
      preguntaTexto,
      valoresGenerados: { k },
      respuestaCorrecta: String(k),
      tolerancia: 0,
    }
  }

  // ángulo doble: sen(x) y cos(x) dados como razones exactas de una terna pitagórica
  if (variante === 'angulo_doble_sen' || variante === 'angulo_doble_cos') {
    const { op: p, ady: q, hip: r } = catetosAlAzar(generarTernaPitagorica(escalaMax))

    const preguntaTexto =
      variante === 'angulo_doble_sen'
        ? `Sabiendo que sen(x) = ${p}/${r} y cos(x) = ${q}/${r}, calcula sen(2x) usando la identidad del ángulo doble.`
        : `Sabiendo que sen(x) = ${p}/${r} y cos(x) = ${q}/${r}, calcula cos(2x) usando la identidad del ángulo doble.`

    const resultado =
      variante === 'angulo_doble_sen'
        ? reducirFraccion(2 * p * q, r * r)
        : reducirFraccion(q * q - p * p, r * r)

    return {
      preguntaTexto,
      valoresGenerados: { p, q, r },
      respuestaCorrecta: formatoFraccionSimple(resultado),
      tolerancia: 0.001,
    }
  }

  // suma de ángulos: dos ternas independientes, una por cada ángulo
  const t1 = catetosAlAzar(generarTernaPitagorica(escalaMax))
  const t2 = catetosAlAzar(generarTernaPitagorica(escalaMax))

  const preguntaTexto = `Sabiendo que sen(a) = ${t1.op}/${t1.hip}, cos(a) = ${t1.ady}/${t1.hip}, sen(b) = ${t2.op}/${t2.hip} y cos(b) = ${t2.ady}/${t2.hip}, calcula sen(a+b) usando la identidad de la suma de ángulos.`

  const resultado = reducirFraccion(t1.op * t2.ady + t1.ady * t2.op, t1.hip * t2.hip)

  return {
    preguntaTexto,
    valoresGenerados: { p1: t1.op, q1: t1.ady, r1: t1.hip, p2: t2.op, q2: t2.ady, r2: t2.hip },
    respuestaCorrecta: formatoFraccionSimple(resultado),
    tolerancia: 0.001,
  }
}

// ---------- trig_ecuacion_simple ----------

// valor exacto = n·√r/d (r=1 => valor racional, sin símbolo de raíz); null = función indefinida
interface ValorExacto { n: number; r: number; d: number }
interface FilaAnguloConocido {
  grados: number
  sen: ValorExacto
  cos: ValorExacto
  tan: ValorExacto | null
}

const TABLA_ANGULOS_CONOCIDOS: FilaAnguloConocido[] = [
  { grados: 0, sen: { n: 0, r: 1, d: 1 }, cos: { n: 1, r: 1, d: 1 }, tan: { n: 0, r: 1, d: 1 } },
  { grados: 30, sen: { n: 1, r: 1, d: 2 }, cos: { n: 1, r: 3, d: 2 }, tan: { n: 1, r: 3, d: 3 } },
  { grados: 45, sen: { n: 1, r: 2, d: 2 }, cos: { n: 1, r: 2, d: 2 }, tan: { n: 1, r: 1, d: 1 } },
  { grados: 60, sen: { n: 1, r: 3, d: 2 }, cos: { n: 1, r: 1, d: 2 }, tan: { n: 1, r: 3, d: 1 } },
  { grados: 90, sen: { n: 1, r: 1, d: 1 }, cos: { n: 0, r: 1, d: 1 }, tan: null },
  { grados: 120, sen: { n: 1, r: 3, d: 2 }, cos: { n: -1, r: 1, d: 2 }, tan: { n: -1, r: 3, d: 1 } },
  { grados: 135, sen: { n: 1, r: 2, d: 2 }, cos: { n: -1, r: 2, d: 2 }, tan: { n: -1, r: 1, d: 1 } },
  { grados: 150, sen: { n: 1, r: 1, d: 2 }, cos: { n: -1, r: 3, d: 2 }, tan: { n: -1, r: 3, d: 3 } },
  { grados: 180, sen: { n: 0, r: 1, d: 1 }, cos: { n: -1, r: 1, d: 1 }, tan: { n: 0, r: 1, d: 1 } },
  { grados: 210, sen: { n: -1, r: 1, d: 2 }, cos: { n: -1, r: 3, d: 2 }, tan: { n: 1, r: 3, d: 3 } },
  { grados: 225, sen: { n: -1, r: 2, d: 2 }, cos: { n: -1, r: 2, d: 2 }, tan: { n: 1, r: 1, d: 1 } },
  { grados: 240, sen: { n: -1, r: 3, d: 2 }, cos: { n: -1, r: 1, d: 2 }, tan: { n: 1, r: 3, d: 1 } },
  { grados: 270, sen: { n: -1, r: 1, d: 1 }, cos: { n: 0, r: 1, d: 1 }, tan: null },
  { grados: 300, sen: { n: -1, r: 3, d: 2 }, cos: { n: 1, r: 1, d: 2 }, tan: { n: -1, r: 3, d: 1 } },
  { grados: 315, sen: { n: -1, r: 2, d: 2 }, cos: { n: 1, r: 2, d: 2 }, tan: { n: -1, r: 1, d: 1 } },
  { grados: 330, sen: { n: -1, r: 1, d: 2 }, cos: { n: 1, r: 3, d: 2 }, tan: { n: -1, r: 3, d: 3 } },
]

// intervalo del cuadrante (cerrado) que contiene a `grados`; garantiza solución
// única porque sen/cos/tan son monótonas dentro de cada cuadrante cerrado
function cuadranteDe(grados: number): [number, number] {
  if (grados <= 90) return [0, 90]
  if (grados <= 180) return [90, 180]
  if (grados <= 270) return [180, 270]
  return [270, 360]
}

function generarTrigEcuacionSimple(parametros: Record<string, number>): GeneracionPlantilla {
  const tMax = requerido(parametros, 't_max')

  const funciones = ['sen', 'cos', 'tan'] as const
  const funcion = funciones[randInt(0, funciones.length - 1)]

  // se excluyen los ángulos donde la función vale 0 (ecuación trivial, cualquier
  // coeficiente la resuelve) y donde tan(x) es indefinida
  const candidatos = TABLA_ANGULOS_CONOCIDOS.filter((fila) => {
    const valor = fila[funcion]
    return valor !== null && valor.n !== 0
  })
  if (candidatos.length === 0) {
    throw new Error('Parámetros inválidos: no hay ángulos candidatos para la función elegida')
  }
  const fila = candidatos[randInt(0, candidatos.length - 1)]
  const valorExacto = fila[funcion] as ValorExacto

  const t = randIntPositivo(1, tMax)
  const k = t * valorExacto.d
  const m = t * valorExacto.n

  const rhsTexto = valorExacto.r === 1 ? String(m) : formatoRadical(m, valorExacto.r)
  const lhsTexto = formatoPrimero(k, `${funcion}(x)`)

  const [lo, hi] = cuadranteDe(fila.grados)
  const preguntaTexto = `Resuelve para x ∈ [${lo}°, ${hi}°]: ${lhsTexto} = ${rhsTexto}`

  return {
    preguntaTexto,
    valoresGenerados: { grados: fila.grados, k, m, radicando: valorExacto.r },
    respuestaCorrecta: String(fila.grados),
    tolerancia: 0,
  }
}

// ---------- trig_razones_triangulo ----------

function generarTrigRazonesTriangulo(parametros: Record<string, number>): GeneracionPlantilla {
  const escalaMax = requerido(parametros, 'escala_max')
  const { op, ady, hip } = catetosAlAzar(generarTernaPitagorica(escalaMax))

  // se revelan solo 2 de los 3 lados; el alumno debe derivar el tercero con
  // Pitágoras (garantizado entero por venir de una terna pitagórica real)
  const tipoCombo = randInt(0, 2)
  let ladosTexto: string
  let anguloTexto: string
  if (tipoCombo === 0) {
    ladosTexto = `los catetos miden ${op} y ${ady}`
    anguloTexto = `el ángulo θ es el opuesto al cateto de longitud ${op}`
  } else if (tipoCombo === 1) {
    ladosTexto = `un cateto mide ${op} y la hipotenusa mide ${hip}`
    anguloTexto = `el ángulo θ es el opuesto al cateto de longitud ${op}`
  } else {
    ladosTexto = `un cateto mide ${ady} y la hipotenusa mide ${hip}`
    anguloTexto = `el ángulo θ es el adyacente al cateto de longitud ${ady}`
  }

  const razones = ['sen', 'cos', 'tan'] as const
  const razon = razones[randInt(0, razones.length - 1)]
  let numerador: number, denominador: number
  if (razon === 'sen') { numerador = op; denominador = hip }
  else if (razon === 'cos') { numerador = ady; denominador = hip }
  else { numerador = op; denominador = ady }

  const preguntaTexto = `En un triángulo rectángulo, ${ladosTexto}; ${anguloTexto}. Calcula ${razon}(θ).`

  const resultado = reducirFraccion(numerador, denominador)

  return {
    preguntaTexto,
    valoresGenerados: { op, ady, hip },
    respuestaCorrecta: formatoFraccionSimple(resultado),
    tolerancia: 0.001,
  }
}

// ---------- limite_raiz ----------

function generarLimiteRaiz(parametros: Record<string, number>): GeneracionPlantilla {
  const pMin = requerido(parametros, 'p_min'), pMax = requerido(parametros, 'p_max')
  const kMin = requerido(parametros, 'k_min'), kMax = requerido(parametros, 'k_max')
  const aMin = requerido(parametros, 'a_min'), aMax = requerido(parametros, 'a_max')

  const indice = Math.random() < 0.5 ? 2 : 3

  const a = randInt(aMin, aMax)
  const p = randIntNoCero(pMin, pMax)
  // índice 2 exige raíz principal (k debe ser positivo); índice 3 admite k
  // negativo porque la raíz cúbica real está definida para negativos también
  const k = indice === 2 ? randIntPositivo(kMin, kMax) : randIntNoCero(kMin, kMax)

  // lim(x→a) (ⁿ√(px+q) - k)/(x-a) = p/(n·k^(n-1)), eligiendo q = k^n - p·a
  // para que ⁿ√(pa+q) = k exactamente (sin decimales)
  const kElevadoN = indice === 2 ? k * k : k * k * k
  const q = kElevadoN - p * a
  const denominadorLimite = indice === 2 ? k : k * k

  const simboloRaiz = indice === 2 ? '√' : '∛'
  const terminoQ = q === 0 ? '' : formatoSiguiente(q, '')
  const expresionRadical = `${simboloRaiz}(${formatoPrimero(p, 'x')}${terminoQ})`
  const terminoK = formatoSiguiente(-k, '')

  const preguntaTexto = `Calcula: lim(x→${a}) (${expresionRadical}${terminoK}) / (x - ${a})`

  const resultado = reducirFraccion(p, indice * denominadorLimite)

  return {
    preguntaTexto,
    valoresGenerados: { indice, a, p, q, k },
    respuestaCorrecta: formatoFraccionSimple(resultado),
    tolerancia: 0.001,
  }
}

function generarReglaDeTres(parametros: Record<string, number>): GeneracionPlantilla {
  const a = randIntPositivo(requerido(parametros, 'a_min'), requerido(parametros, 'a_max'))
  const k = randIntPositivo(requerido(parametros, 'k_min'), requerido(parametros, 'k_max'))
  const c = randIntPositivo(requerido(parametros, 'c_min'), requerido(parametros, 'c_max'))

  const b = a * k
  const x = k * c

  const preguntaTexto = `Si ${a} unidades cuestan ${b}, ¿cuánto cuestan ${c} unidades?`

  return {
    preguntaTexto,
    valoresGenerados: { a, b, c, k },
    respuestaCorrecta: String(x),
    tolerancia: 0,
  }
}

export function generarPlantilla(
  tipo: string,
  parametros: Record<string, number>
): GeneracionPlantilla {
  switch (tipo as TipoPlantilla) {
    case 'ecuacion_lineal': return generarEcuacionLineal(parametros)
    case 'sistema_2x2': return generarSistema2x2(parametros)
    case 'factorizacion_trinomio': return generarFactorizacionTrinomio(parametros)
    case 'factor_comun': return generarFactorComun(parametros)
    case 'regla_de_tres': return generarReglaDeTres(parametros)
    case 'sistema_2x2_fracciones': return generarSistema2x2Fracciones(parametros)
    case 'ecuacion_lineal_radical': return generarEcuacionLinealRadical(parametros)
    case 'factorizacion_exponentes_negativos': return generarFactorizacionExponentesNegativos(parametros)
    case 'factorizacion_grado_3_4': return generarFactorizacionGrado34(parametros)
    case 'ecuacion_cuadratica': return generarEcuacionCuadratica(parametros)
    case 'limite_racional_directo': return generarLimiteRacionalDirecto(parametros)
    case 'limite_indeterminado': return generarLimiteIndeterminado(parametros)
    case 'derivada_polinomio': return generarDerivadaPolinomio(parametros)
    case 'derivada_racional': return generarDerivadaRacional(parametros)
    case 'derivada_potencias_negativas': return generarDerivadaPotenciasNegativas(parametros)
    case 'trig_identidad': return generarTrigIdentidad(parametros)
    case 'trig_ecuacion_simple': return generarTrigEcuacionSimple(parametros)
    case 'trig_razones_triangulo': return generarTrigRazonesTriangulo(parametros)
    case 'limite_raiz': return generarLimiteRaiz(parametros)
    case 'factorizacion_trinomio_lider': return generarFactorizacionTrinomioLider(parametros)
    case 'factorizacion_agrupacion': return generarFactorizacionAgrupacion(parametros)
    case 'factorizacion_suma_cubos': return generarFactorizacionSumaCubos(parametros)
    case 'factorizacion_diferencia_cubos': return generarFactorizacionDiferenciaCubos(parametros)
    case 'factorizacion_combinada': return generarFactorizacionCombinada(parametros)
    default:
      throw new Error(`Tipo de plantilla desconocido: ${tipo}`)
  }
}

// ---------- normalización de texto algebraico ----------

// un término puede ser: constante ("5", "-3"), "x" con coeficiente implícito 1
// ("x", "-x", "3x"), o "x" con exponente explícito ("x{2}", "-2x{-3}") — la forma
// "x{N}" es una convención interna: normalizarTextoAlgebraico convierte ahí
// cualquier notación de exponente (², ⁻¹, ^2, etc.) antes de tokenizar.
function normalizarBinomio(expr: string): string {
  const terminos = expr.match(/[+-]?\d*x\{-?\d+\}|[+-]?\d*x|[+-]?\d+/g) || []
  const porExponente = new Map<number, number>()

  for (const term of terminos) {
    const conExponente = term.match(/^([+-]?\d*)x\{(-?\d+)\}$/)
    const sinExponente = term.match(/^([+-]?\d*)x$/)

    if (conExponente) {
      const exponente = parseInt(conExponente[2], 10)
      const coef = leerCoeficiente(conExponente[1])
      porExponente.set(exponente, (porExponente.get(exponente) || 0) + coef)
    } else if (sinExponente) {
      const coef = leerCoeficiente(sinExponente[1])
      porExponente.set(1, (porExponente.get(1) || 0) + coef)
    } else {
      const valor = parseInt(term, 10)
      porExponente.set(0, (porExponente.get(0) || 0) + valor)
    }
  }

  const exponentes = [...porExponente.keys()].sort((a, b) => a - b)
  return exponentes
    .filter((e) => porExponente.get(e) !== 0)
    .map((e) => {
      const coef = porExponente.get(e) as number
      if (e === 0) return String(coef)
      const variable = e === 1 ? 'x' : `x{${e}}`
      const coefTexto = Math.abs(coef) === 1 ? (coef < 0 ? '-' : '') : String(coef)
      return `${coefTexto}${variable}`
    })
    .join(',')
}

function leerCoeficiente(coefStr: string): number {
  if (coefStr === '' || coefStr === '+') return 1
  if (coefStr === '-') return -1
  return parseInt(coefStr, 10)
}

export function normalizarTextoAlgebraico(texto: string): string {
  let t = texto.toLowerCase().replace(/\s+/g, '').replace(/\*/g, '')

  // (expr)^2 o (expr)² -> (expr)(expr), para que el cuadrado perfecto
  // se compare igual escrito como potencia o como producto repetido
  t = t.replace(/\(([^()]+)\)(\^2|²)/g, '($1)($1)')

  // exponentes de un término suelto ("x^-2", "x⁻²", "3x²") -> forma interna "x{N}"
  t = t.replace(/x\^(-?\d+)/g, (_, exp: string) => `x{${exp}}`)
  t = t.replace(/x(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, sup: string) => {
    const negativo = sup.startsWith('⁻')
    const digitos = sup.replace('⁻', '').split('').map((c) => SUPERINDICES_INVERSA[c]).join('')
    return `x{${negativo ? '-' : ''}${digitos}}`
  })

  const factores: string[] = []
  const regexFactor = /\(([^()]+)\)|(-?\d*x(?:\{-?\d+\})?)|(-?\d+)/g
  let match: RegExpExecArray | null
  while ((match = regexFactor.exec(t)) !== null) {
    if (match[1] !== undefined) factores.push(normalizarBinomio(match[1]))
    else if (match[2] !== undefined) factores.push(normalizarBinomio(match[2]))
    else factores.push(match[3])
  }

  if (factores.length === 0) return t

  factores.sort()
  return factores.join('·')
}

// ---------- normalización de radicales ----------

export function normalizarRadical(texto: string): string {
  let t = texto.toLowerCase().replace(/\s+/g, '').replace(/\*/g, '')
  t = t.replace(/sqrt\(([^)]+)\)/g, '√$1')
  t = t.replace(/raiz\(([^)]+)\)/g, '√$1')

  const match = t.match(/^(-?\d*)√(\d+)$/)
  if (!match) return t

  const coefBase = leerCoeficiente(match[1])
  const radicandoBase = parseInt(match[2], 10)

  const simplificado = simplificarRadical(radicandoBase)
  return formatoRadical(coefBase * simplificado.coef, simplificado.radicando)
}
