export type TipoPlantilla =
  | 'ecuacion_lineal'
  | 'sistema_2x2'
  | 'factorizacion_trinomio'
  | 'factor_comun'
  | 'regla_de_tres'

export interface GeneracionPlantilla {
  preguntaTexto: string
  valoresGenerados: Record<string, number>
  respuestaCorrecta: string | { x: number; y: number }
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
    default:
      throw new Error(`Tipo de plantilla desconocido: ${tipo}`)
  }
}

// ---------- normalización de texto algebraico ----------

function normalizarBinomio(expr: string): string {
  const terminos = expr.match(/[+-]?[^+-]+/g) || []
  let coefX = 0
  let constante = 0

  for (const term of terminos) {
    if (term.includes('x')) {
      const coefStr = term.replace('x', '')
      if (coefStr === '' || coefStr === '+') coefX += 1
      else if (coefStr === '-') coefX += -1
      else coefX += parseInt(coefStr, 10)
    } else {
      constante += parseInt(term, 10)
    }
  }

  const coefTexto = coefX === 1 ? '' : coefX === -1 ? '-' : String(coefX)
  const constSigno = constante >= 0 ? '+' : ''
  return `${coefTexto}x${constSigno}${constante}`
}

export function normalizarTextoAlgebraico(texto: string): string {
  let t = texto.toLowerCase().replace(/\s+/g, '').replace(/\*/g, '')

  // (expr)^2 o (expr)² -> (expr)(expr), para que el cuadrado perfecto
  // se compare igual escrito como potencia o como producto repetido
  t = t.replace(/\(([^()]+)\)(\^2|²)/g, '($1)($1)')

  const factores: string[] = []
  const regexFactor = /\(([^()]+)\)|(-?\d+)/g
  let match: RegExpExecArray | null
  while ((match = regexFactor.exec(t)) !== null) {
    factores.push(match[1] !== undefined ? normalizarBinomio(match[1]) : match[2])
  }

  if (factores.length === 0) return t

  factores.sort()
  return factores.join('·')
}
