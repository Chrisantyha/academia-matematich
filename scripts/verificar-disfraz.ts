// Red de seguridad para las técnicas de disfraz de lib/algebra/: confirma que
// disfrazar nunca cambia el valor de la expresión (o, para Factor común
// intermedio, que preserva la relación entre los dos lados de una igualdad),
// evaluando en varios x (incluyendo no enteros) tanto cada técnica por
// separado como combinaciones mezcladas reales.
//
// Uso: npx tsx scripts/verificar-disfraz.ts

import { evaluar, num, variable, potencia, suma, prod, grupo, renderizar, Nodo } from '../lib/algebra/ast'
import { distribucion } from '../lib/algebra/tecnicas/distribucion'
import { fracciones } from '../lib/algebra/tecnicas/fracciones'
import { agrupacion } from '../lib/algebra/tecnicas/agrupacion'
import { fraccionAlgebraica } from '../lib/algebra/tecnicas/fraccion-algebraica'
import { factorComunIntermedio, Igualdad } from '../lib/algebra/tecnicas/factor-comun-intermedio'
import { recolectarSumas, reemplazarEnCamino, aplicarMezcla } from '../lib/algebra/mezcla'
import { crearRngConSemilla } from '../lib/algebra/rng'
import { generarPlantilla, normalizarTextoAlgebraico } from '../lib/plantillas'

function construirTrinomioNodoGeneral(a: number, b: number, c: number): Nodo {
  const terminos: Nodo[] = [prod([num(a), potencia(variable('x'), 2)])]
  if (b !== 0) terminos.push(prod([num(b), variable('x')]))
  if (c !== 0) terminos.push(num(c))
  return suma(terminos)
}

// reordena los factores de nivel superior de una respuesta factorizada
// ("(3x+2)(4x-1)" -> "(4x-1)(3x+2)") para confirmar que normalizarTextoAlgebraico
// (la función real de calificación) es insensible al orden también en las
// formas nuevas: coeficiente != 1 en x, factor de grado 2 con coeficiente.
function ordenNoImporta(respuesta: string): boolean {
  const partes = respuesta.match(/\([^()]*\)|[+-]?\d+/g) ?? []
  if (partes.length < 2) return true
  const variante = [...partes].reverse().join('')
  return normalizarTextoAlgebraico(respuesta) === normalizarTextoAlgebraico(variante)
}

function construirTrinomioLimpio(b: number, c: number): Nodo {
  const terminos: Nodo[] = [prod([num(1), potencia(variable('x'), 2)])]
  if (b !== 0) terminos.push(prod([num(b), variable('x')]))
  if (c !== 0) terminos.push(num(c))
  return suma(terminos)
}

const VALORES_X_PRUEBA = [-13.7, -3, -1, 0, 0.5, 2, 7, 11.25, 100]
const EPS = 1e-9

function equivalentes(limpio: Nodo, disfrazado: Nodo): { ok: boolean; detalle?: string } {
  // Simplificación de fracción algebraica introduce un polo removible en
  // x=-m (el denominador se anula ahí, aunque la expresión ORIGINAL sí está
  // definida). Si algún x de prueba cae justo ahí, evaluar() da NaN/Infinity
  // por división por cero — eso es esperado (no un bug de la técnica) y se
  // salta esa comparación puntual en vez de dejar que "NaN > EPS === false"
  // la deje pasar en falso.
  let comparaciones = 0
  for (const x of VALORES_X_PRUEBA) {
    const va = evaluar(limpio, { x })
    const vb = evaluar(disfrazado, { x })
    if (!Number.isFinite(vb)) continue
    comparaciones++
    const diff = Math.abs(va - vb)
    const escala = Math.max(1, Math.abs(va))
    if (diff / escala > EPS) {
      return { ok: false, detalle: `x=${x}: limpio=${va}, disfrazado=${vb} (diff=${diff})` }
    }
  }
  if (comparaciones === 0) {
    return { ok: false, detalle: 'ningún valor de x de prueba pudo compararse (todos cayeron en un polo)' }
  }
  return { ok: true }
}

const CASOS_BC: [number, number][] = [
  [0, 5], [3, 0], [0, 0], [-4, 7], [4, -7], [-4, -7],
  [1, 1], [-1, -1], [12, -30], [-12, 30], [100, -250], [-100, 250],
  [7, 0], [0, -9],
]

let totalFallas = 0
function reportar(seccion: string, total: number, fallos: number) {
  console.log(`[${seccion}] ${total - fallos}/${total} casos equivalentes.`)
  totalFallas += fallos
}

// ---------- 1) Distribución (regresión de Tanda 2) ----------
{
  let total = 0, fallos = 0
  for (const [b, c] of CASOS_BC) {
    for (let semilla = 1; semilla <= 20; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 97 + b * 13 + c * 7 + 1000)
      const limpio = construirTrinomioLimpio(b, c)
      const disfrazado = distribucion(limpio, rng)
      const r = equivalentes(limpio, disfrazado)
      if (!r.ok) { fallos++; console.error(`FALLO distribucion (b=${b},c=${c},s=${semilla}): ${r.detalle}`) }
    }
  }
  reportar('Distribución', total, fallos)
}

// ---------- 2) Fracciones ----------
{
  let total = 0, fallos = 0
  for (const [b, c] of CASOS_BC) {
    for (let semilla = 1; semilla <= 20; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 61 + b * 11 + c * 5 + 2000)
      const limpio = construirTrinomioLimpio(b, c)
      try {
        const disfrazado = fracciones(limpio, rng)
        const r = equivalentes(limpio, disfrazado)
        if (!r.ok) { fallos++; console.error(`FALLO fracciones (b=${b},c=${c},s=${semilla}): ${r.detalle}`) }
      } catch (err) {
        // b=0 && c=0 -> solo queda el líder, sin candidatos: falla esperada, no es un error de la técnica
        if (!(b === 0 && c === 0)) { fallos++; console.error(`FALLO fracciones (b=${b},c=${c},s=${semilla}): ${err}`) }
        else total--
      }
    }
  }
  reportar('Fracciones', total, fallos)
}

// ---------- 3) Agrupación ----------
{
  let total = 0, fallos = 0
  for (const [b, c] of CASOS_BC) {
    for (let semilla = 1; semilla <= 20; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 53 + b * 17 + c * 3 + 3000)
      const limpio = construirTrinomioLimpio(b, c)
      try {
        const disfrazado = agrupacion(limpio, rng)
        const r = equivalentes(limpio, disfrazado)
        if (!r.ok) { fallos++; console.error(`FALLO agrupacion (b=${b},c=${c},s=${semilla}): ${r.detalle}`) }
      } catch {
        // sin término no-líder con |coef|>=2 disponible: falla esperada (ej. b=0,c=0 o b=±1 sin otro candidato)
        total--
      }
    }
  }
  reportar('Agrupación', total, fallos)
}

// ---------- 4) Simplificación de fracción algebraica ----------
{
  let total = 0, fallos = 0
  for (const [b, c] of CASOS_BC) {
    for (let semilla = 1; semilla <= 20; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 41 + b * 19 + c * 9 + 4000)
      const limpio = construirTrinomioLimpio(b, c)
      const disfrazado = fraccionAlgebraica(limpio, rng)
      const r = equivalentes(limpio, disfrazado)
      if (!r.ok) { fallos++; console.error(`FALLO fraccionAlgebraica (b=${b},c=${c},s=${semilla}): ${r.detalle}`) }
    }
  }
  reportar('Simplificación de fracción algebraica', total, fallos)
}

// ---------- 5) Caso anidado emergente ("agrupadores anidados") ----------
// Distribución aplicada dos veces: la 2da pasada apunta específicamente al
// sub-nodo (x+m) que inyectó la 1ra, produciendo algo tipo "4(x - 2 + 3(x+1))".
{
  let total = 0, fallos = 0
  for (const [b, c] of CASOS_BC) {
    for (let semilla = 1; semilla <= 15; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 29 + b * 23 + c * 11 + 5000)
      const limpio = construirTrinomioLimpio(b, c)
      const primeraPasada = distribucion(limpio, rng)

      // encontrar el sub-nodo (x+m) que Distribución acaba de inyectar y aplicarle
      // Distribución de nuevo, a propósito, para forzar el anidado
      const sumas = recolectarSumas(primeraPasada)
      const interior = sumas.find((s) => s.camino.length > 0) // cualquiera que no sea la raíz
      let segundaPasada = primeraPasada
      if (interior) {
        const nuevoInterior = distribucion(interior.nodo, rng)
        segundaPasada = reemplazarEnCamino(primeraPasada, interior.camino, nuevoInterior)
      }

      const r = equivalentes(limpio, segundaPasada)
      if (!r.ok) { fallos++; console.error(`FALLO anidado (b=${b},c=${c},s=${semilla}): ${r.detalle}`) }
      if (semilla === 1 && b === -4 && c === 7) {
        console.log(`  ejemplo anidado: ${renderizar(limpio)}   ~~>   ${renderizar(segundaPasada)}`)
      }
    }
  }
  reportar('Anidado emergente (Distribución x2)', total, fallos)
}

// ---------- 6) Motor de mezcla: combinaciones reales de 1-3 técnicas ----------
{
  let total = 0, fallos = 0
  const conteoCombos = new Map<string, number>()
  const ejemplos: string[] = []
  for (const [b, c] of CASOS_BC) {
    for (let semilla = 1; semilla <= 40; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 17 + b * 31 + c * 13 + 6000)
      const limpio = construirTrinomioLimpio(b, c)
      const { nodo: disfrazado, tecnicasAplicadas } = aplicarMezcla(limpio, rng)
      const r = equivalentes(limpio, disfrazado)
      if (!r.ok) {
        fallos++
        console.error(`FALLO mezcla (b=${b},c=${c},s=${semilla}, técnicas=${tecnicasAplicadas.join('+')}): ${r.detalle}`)
      }
      const clave = tecnicasAplicadas.length === 0 ? '(sin disfraz)' : [...tecnicasAplicadas].sort().join('+')
      conteoCombos.set(clave, (conteoCombos.get(clave) ?? 0) + 1)
      if (ejemplos.length < 10 && tecnicasAplicadas.length >= 2) {
        ejemplos.push(`  [${tecnicasAplicadas.join(' + ')}]  ${renderizar(limpio)}   ~~>   ${renderizar(disfrazado)}`)
      }
    }
  }
  reportar('Motor de mezcla (1-3 técnicas, sub-nodos al azar)', total, fallos)
  console.log('\nDistribución de combinaciones de técnicas observadas:')
  for (const [combo, n] of [...conteoCombos.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${combo}: ${n}`)
  }
  console.log('\nEjemplos con 2+ técnicas mezcladas:')
  console.log(ejemplos.join('\n'))
}

// ---------- 7) Factor común intermedio (standalone, sobre una Igualdad sintética) ----------
{
  let total = 0, fallos = 0
  const CASOS_ECUACION: [number, number, number][] = [
    [2, 6, 20], [-3, 5, -10], [7, 0, 21], [1, -4, 9], [-5, -2, 13], [4, 11, -1],
  ]
  function brechaEnX(igualdad: Igualdad, x: number): number {
    return evaluar(igualdad.izquierda, { x }) - evaluar(igualdad.derecha, { x })
  }
  for (const [a, b, c] of CASOS_ECUACION) {
    for (let semilla = 1; semilla <= 20; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 71 + a * 37 + b * 19 + c * 5 + 7000)
      const original: Igualdad = { izquierda: suma([prod([num(a), variable('x')]), num(b)]), derecha: num(c) }
      // extraer m real aplicado: comparamos brecha antes/después en un x cualquiera != raíz
      const disfrazada = factorComunIntermedio(original, rng)
      let ok = true
      let detalle = ''
      const xRef = 5.5
      const brechaOriginal = brechaEnX(original, xRef)
      const brechaNueva = brechaEnX(disfrazada, xRef)
      if (Math.abs(brechaOriginal) < 1e-12) {
        ok = false
        detalle = 'x de referencia coincide con la raíz, no sirve para medir el factor'
      } else {
        const m = brechaNueva / brechaOriginal
        // la brecha nueva debe ser EXACTAMENTE m veces la original en TODOS los x
        // (no solo en xRef) -> equivale a que las soluciones se preserven
        for (const x of VALORES_X_PRUEBA) {
          const bOrig = brechaEnX(original, x)
          const bNueva = brechaEnX(disfrazada, x)
          const esperado = m * bOrig
          const diff = Math.abs(bNueva - esperado)
          const escala = Math.max(1, Math.abs(esperado))
          if (diff / escala > EPS) {
            ok = false
            detalle = `x=${x}: brecha_nueva=${bNueva}, esperado m·brecha_orig=${esperado}`
            break
          }
        }
      }
      if (!ok) { fallos++; console.error(`FALLO factorComunIntermedio (a=${a},b=${b},c=${c},s=${semilla}): ${detalle}`) }
    }
  }
  reportar('Factor común intermedio (standalone, preserva la solución)', total, fallos)
}

// ---------- 8) Integración end-to-end vía generarPlantilla ----------
{
  const parametros = { p_min: -12, p_max: 12, q_min: -12, q_max: 12 }
  let total = 0, fallos = 0
  const ejemplos: string[] = []
  for (let i = 0; i < 500; i++) {
    total++
    const resultado = generarPlantilla('factorizacion_trinomio', parametros)
    const { p, q, b, c } = resultado.valoresGenerados
    if (p + q !== b || p * q !== c) {
      fallos++
      console.error(`FALLO integración: p=${p} q=${q} -> b=${b} (esperado ${p + q}), c=${c} (esperado ${p * q})`)
    }
    if (i < 10) ejemplos.push(`  ${resultado.preguntaTexto}   =>   ${resultado.respuestaCorrecta}`)
  }
  reportar('Integración factorizacion_trinomio (b=p+q, c=p·q)', total, fallos)
  console.log('\nEjemplos generados por generarPlantilla (motor de mezcla real, 1-3 técnicas):')
  console.log(ejemplos.join('\n'))
}

// ---------- 9) Trinomio con coeficiente líder: identidad a=pr,b=ps+qr,c=qs + disfraz ----------
{
  let total = 0, fallos = 0, fallosOrden = 0
  const CASOS_PQRS: [number, number, number, number][] = [
    [2, 3, 3, 1], [-2, 5, 3, -4], [3, -2, 4, 5], [-3, -1, -2, -7], [5, 2, -3, 6], [2, -6, -1, 4],
  ]
  for (const [p, q, r, s] of CASOS_PQRS) {
    for (let semilla = 1; semilla <= 15; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 89 + p * 41 + q * 23 + r * 17 + s * 11 + 8000)
      const a = p * r, b = p * s + q * r, c = q * s
      const targetLimpio = construirTrinomioNodoGeneral(a, b, c)

      // identidad: (px+q)(rx+s) evaluado independientemente == a·x²+b·x+c
      const respuestaNodo = prod([
        grupo(suma([prod([num(p), variable('x')]), num(q)])),
        grupo(suma([prod([num(r), variable('x')]), num(s)])),
      ])
      const rIdentidad = equivalentes(targetLimpio, respuestaNodo)
      if (!rIdentidad.ok) { fallos++; console.error(`FALLO identidad trinomio_lider (p=${p},q=${q},r=${r},s=${s}): ${rIdentidad.detalle}`) }

      // disfraz: el toolbox tiene que seguir preservando el valor con líder != 1
      const { nodo: disfrazado } = aplicarMezcla(targetLimpio, rng)
      const rDisfraz = equivalentes(targetLimpio, disfrazado)
      if (!rDisfraz.ok) { fallos++; console.error(`FALLO disfraz trinomio_lider (p=${p},q=${q},r=${r},s=${s}): ${rDisfraz.detalle}`) }

      if (!ordenNoImporta(`(${p}x+${q})(${r}x+${s})`)) fallosOrden++
    }
  }
  reportar('Trinomio con coeficiente líder (identidad + disfraz)', total * 2, fallos)
  if (fallosOrden > 0) { fallos++; console.error(`FALLO: normalizarTextoAlgebraico no es insensible al orden en ${fallosOrden} casos de trinomio_lider`) }
}

// ---------- 10) Factor común por agrupación: identidad del split determinístico (sin disfraz) ----------
{
  let total = 0, fallos = 0
  const CASOS_PQRS: [number, number, number, number][] = [
    [2, 3, 3, 1], [-2, 5, 3, -4], [3, -2, 4, 5], [-3, -1, -2, -7], [5, 2, -3, 6], [2, -6, -1, 4],
  ]
  for (const [p, q, r, s] of CASOS_PQRS) {
    total++
    const a = p * r, c = q * s
    const terminoPS = p * s, terminoQR = q * r
    const nodoEnunciado = suma([
      prod([num(a), potencia(variable('x'), 2)]),
      prod([num(terminoPS), variable('x')]),
      prod([num(terminoQR), variable('x')]),
      num(c),
    ])
    const respuestaNodo = prod([
      grupo(suma([prod([num(p), variable('x')]), num(q)])),
      grupo(suma([prod([num(r), variable('x')]), num(s)])),
    ])
    const chequeo = equivalentes(nodoEnunciado, respuestaNodo)
    if (!chequeo.ok) { fallos++; console.error(`FALLO agrupación-construcción (p=${p},q=${q},r=${r},s=${s}): ${chequeo.detalle}`) }
  }
  reportar('Factor común por agrupación (split determinístico agrupa correcto)', total, fallos)
}

// ---------- 11) Suma / diferencia de cubos: identidad + disfraz ----------
{
  let total = 0, fallos = 0, fallosOrden = 0
  const CASOS_KM: [number, number][] = [[1, 2], [2, 3], [-2, 3], [3, -2], [1, -5], [-1, -4], [4, 1]]
  for (const signo of [1, -1] as const) {
    for (const [k, m] of CASOS_KM) {
      for (let semilla = 1; semilla <= 10; semilla++) {
        total++
        const rng = crearRngConSemilla(semilla * 53 + k * 31 + m * 19 + (signo === 1 ? 0 : 5000) + 9000)
        const k3 = k * k * k, m3 = m * m * m
        const targetLimpio = suma([prod([num(k3), potencia(variable('x'), 3)]), num(signo * m3)])

        const respuestaNodo = prod([
          grupo(suma([prod([num(k), variable('x')]), num(signo * m)])),
          grupo(suma([prod([num(k * k), potencia(variable('x'), 2)]), prod([num(-signo * k * m), variable('x')]), num(m * m)])),
        ])
        const rIdentidad = equivalentes(targetLimpio, respuestaNodo)
        if (!rIdentidad.ok) {
          fallos++
          console.error(`FALLO identidad cubos (signo=${signo},k=${k},m=${m}): ${rIdentidad.detalle}`)
        }

        const { nodo: disfrazado } = aplicarMezcla(targetLimpio, rng)
        const rDisfraz = equivalentes(targetLimpio, disfrazado)
        if (!rDisfraz.ok) { fallos++; console.error(`FALLO disfraz cubos (signo=${signo},k=${k},m=${m}): ${rDisfraz.detalle}`) }

        if (semilla === 1) {
          const kmTerm = -signo * k * m
          const respuesta = `(${k}x${signo * m >= 0 ? '+' : ''}${signo * m})(${k * k}x²${kmTerm >= 0 ? '+' : ''}${kmTerm}x${m * m >= 0 ? '+' : ''}${m * m})`
          if (!ordenNoImporta(respuesta)) fallosOrden++
        }
      }
    }
  }
  reportar('Suma/diferencia de cubos (identidad + disfraz)', total * 2, fallos)
  if (fallosOrden > 0) { fallos++; console.error(`FALLO: normalizarTextoAlgebraico no es insensible al orden en ${fallosOrden} casos de cubos`) }
}

// ---------- 12) Combinado: identidad (2 y 3 pasos) + disfraz ----------
{
  let total = 0, fallos = 0
  const CASOS_2PASOS: [number, number, number][] = [[3, 2, 5], [-4, 3, -6], [5, -2, 7], [-3, -1, -8]] // g,p,q
  const CASOS_3PASOS: [number, number, number, number, number][] = [[3, 2, 3, 3, 1], [-4, -2, 5, 3, -4], [5, 3, -2, 4, 5]] // g,p,q,r,s

  for (const [g, p, q] of CASOS_2PASOS) {
    for (let semilla = 1; semilla <= 10; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 47 + g * 29 + p * 13 + q * 7 + 10000)
      const a = g * 1, b = g * (p + q), c = g * (p * q)
      const targetLimpio = construirTrinomioNodoGeneral(a, b, c)
      const respuestaNodo = prod([
        num(g),
        grupo(suma([variable('x'), num(p)])),
        grupo(suma([variable('x'), num(q)])),
      ])
      const rIdentidad = equivalentes(targetLimpio, respuestaNodo)
      if (!rIdentidad.ok) { fallos++; console.error(`FALLO identidad combinada-2pasos (g=${g},p=${p},q=${q}): ${rIdentidad.detalle}`) }
      const { nodo: disfrazado } = aplicarMezcla(targetLimpio, rng)
      const rDisfraz = equivalentes(targetLimpio, disfrazado)
      if (!rDisfraz.ok) { fallos++; console.error(`FALLO disfraz combinada-2pasos (g=${g},p=${p},q=${q}): ${rDisfraz.detalle}`) }
    }
  }
  for (const [g, p, q, r, s] of CASOS_3PASOS) {
    for (let semilla = 1; semilla <= 10; semilla++) {
      total++
      const rng = crearRngConSemilla(semilla * 43 + g * 31 + p * 19 + q * 11 + r * 7 + s * 3 + 11000)
      const a = g * (p * r), b = g * (p * s + q * r), c = g * (q * s)
      const targetLimpio = construirTrinomioNodoGeneral(a, b, c)
      const respuestaNodo = prod([
        num(g),
        grupo(suma([prod([num(p), variable('x')]), num(q)])),
        grupo(suma([prod([num(r), variable('x')]), num(s)])),
      ])
      const rIdentidad = equivalentes(targetLimpio, respuestaNodo)
      if (!rIdentidad.ok) { fallos++; console.error(`FALLO identidad combinada-3pasos (g=${g},p=${p},q=${q},r=${r},s=${s}): ${rIdentidad.detalle}`) }
      const { nodo: disfrazado } = aplicarMezcla(targetLimpio, rng)
      const rDisfraz = equivalentes(targetLimpio, disfrazado)
      if (!rDisfraz.ok) { fallos++; console.error(`FALLO disfraz combinada-3pasos (g=${g},p=${p},q=${q},r=${r},s=${s}): ${rDisfraz.detalle}`) }
    }
  }
  reportar('Combinada 2-3 pasos (identidad + disfraz)', total * 2, fallos)
}

// ---------- 13) Integración end-to-end de las 5 plantillas nuevas ----------
{
  const PLANTILLAS_NUEVAS: [string, Record<string, number>][] = [
    ['factorizacion_trinomio_lider', { p_min: -5, p_max: 5, q_min: -10, q_max: 10, r_min: -5, r_max: 5, s_min: -10, s_max: 10 }],
    ['factorizacion_agrupacion', { p_min: -5, p_max: 5, q_min: -10, q_max: 10, r_min: -5, r_max: 5, s_min: -10, s_max: 10 }],
    ['factorizacion_suma_cubos', { k_min: 1, k_max: 4, m_min: -6, m_max: 6 }],
    ['factorizacion_diferencia_cubos', { k_min: 1, k_max: 4, m_min: -6, m_max: 6 }],
    ['factorizacion_combinada', { g_min: 2, g_max: 6, p_min: -5, p_max: 5, q_min: -8, q_max: 8, r_min: -5, r_max: 5, s_min: -8, s_max: 8 }],
  ]

  for (const [tipo, parametros] of PLANTILLAS_NUEVAS) {
    let total = 0, fallos = 0
    const ejemplos: string[] = []
    for (let i = 0; i < 200; i++) {
      total++
      const resultado = generarPlantilla(tipo, parametros)
      const v = resultado.valoresGenerados

      // cada plantilla expone un subconjunto distinto de valoresGenerados (por
      // diseño: agrupacion no tiene "b" combinado, cubos no tiene a/b/c en
      // absoluto) — comparamos solo los campos que esa plantilla realmente
      // expone, no un esquema uniforme.
      if (tipo === 'factorizacion_trinomio_lider') {
        const aEsperado = v.p * v.r, bEsperado = v.p * v.s + v.q * v.r, cEsperado = v.q * v.s
        if (v.a !== aEsperado || v.b !== bEsperado || v.c !== cEsperado) {
          fallos++
          console.error(`FALLO integración ${tipo}: a=${v.a}(esp.${aEsperado}) b=${v.b}(esp.${bEsperado}) c=${v.c}(esp.${cEsperado})`)
        }
      } else if (tipo === 'factorizacion_agrupacion') {
        const aEsperado = v.p * v.r, cEsperado = v.q * v.s
        const psEsperado = v.p * v.s, qrEsperado = v.q * v.r
        if (v.a !== aEsperado || v.c !== cEsperado || v.terminoPS !== psEsperado || v.terminoQR !== qrEsperado) {
          fallos++
          console.error(`FALLO integración ${tipo}: a=${v.a}(esp.${aEsperado}) c=${v.c}(esp.${cEsperado}) split=(${v.terminoPS},${v.terminoQR})(esp.(${psEsperado},${qrEsperado}))`)
        }
      } else if (tipo === 'factorizacion_suma_cubos' || tipo === 'factorizacion_diferencia_cubos') {
        const k3Esperado = v.k ** 3, m3Esperado = v.m ** 3
        if (v.k3 !== k3Esperado || v.m3 !== m3Esperado) {
          fallos++
          console.error(`FALLO integración ${tipo}: k3=${v.k3}(esp.${k3Esperado}) m3=${v.m3}(esp.${m3Esperado})`)
        }
      } else {
        // combinada
        const aEsperado = v.tresPasos === 1 ? v.g * (v.p * v.r) : v.g
        const bEsperado = v.tresPasos === 1 ? v.g * (v.p * v.s + v.q * v.r) : v.g * (v.p + v.q)
        const cEsperado = v.tresPasos === 1 ? v.g * (v.q * v.s) : v.g * (v.p * v.q)
        if (v.a !== aEsperado || v.b !== bEsperado || v.c !== cEsperado) {
          fallos++
          console.error(`FALLO integración ${tipo}: a=${v.a}(esp.${aEsperado}) b=${v.b}(esp.${bEsperado}) c=${v.c}(esp.${cEsperado})`)
        }
      }
      if (i < 5) ejemplos.push(`  ${resultado.preguntaTexto}   =>   ${resultado.respuestaCorrecta}`)
    }
    reportar(`Integración ${tipo}`, total, fallos)
    console.log(ejemplos.join('\n'))
  }
}

console.log()
if (totalFallas > 0) {
  console.error(`RED DE SEGURIDAD: FALLÓ (${totalFallas} casos)`)
  process.exit(1)
} else {
  console.log('RED DE SEGURIDAD: OK — ninguna técnica, ni combinación mezclada, rompió la equivalencia matemática.')
}
