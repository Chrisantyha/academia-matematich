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

export interface GeneracionPlantilla {
  preguntaTexto: string
  valoresGenerados: Record<string, number>
  respuestaCorrecta: string | { x: number; y: number } | { x1: number; x2: number }
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

  const terminoB = b === 0 ? '' : formatoSiguiente(b, 'x')
  const terminoC = c === 0 ? '' : formatoSiguiente(c, '')
  const preguntaTexto = `Factoriza: x²${terminoB}${terminoC}`

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
