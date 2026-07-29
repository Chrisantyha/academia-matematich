import { Nodo, num, variable, suma, prod, grupo, gradoDeTermino, coeficienteDeTermino } from '../ast'
import { Rng } from '../rng'

export interface OpcionesDistribucion {
  ruidoMin?: number // rango de |a|, default 1..4
  ruidoMax?: number
  desplazamientoMin?: number // rango de m (m != 0), default -5..5
  desplazamientoMax?: number
}

// Técnica "Distribución": disfraza un polinomio en x (nodo 'suma') inyectando
// un binomio sin expandir a(x+m) y compensando su expansión (ax + am) contra
// los coeficientes de grado 1 y 0 existentes. El valor del polinomio no
// cambia — el alumno tiene que distribuir y volver a agrupar para llegar al
// mismo resultado limpio. No toca términos de grado >= 2 (se preservan tal
// cual), así que es aplicable a cualquier polinomio, no solo a trinomios.
//
// Antes:  x² + 2x + 5
// Después: x² - x + 8 + 3(x - 1)     [a=3, m=-1: -a=-3 se resta de b, -a·m=3 se resta de c]
//   al distribuir: x² - x + 8 + 3x - 3 = x² + 2x + 5 ✓
export function distribucion(objetivo: Nodo, rng: Rng, opciones: OpcionesDistribucion = {}): Nodo {
  if (objetivo.tipo !== 'suma') {
    throw new Error('distribucion: se esperaba un polinomio (nodo "suma")')
  }

  const ruidoMin = opciones.ruidoMin ?? 1
  const ruidoMax = opciones.ruidoMax ?? 4
  const despMin = opciones.desplazamientoMin ?? -5
  const despMax = opciones.desplazamientoMax ?? 5

  const porGrado = new Map<number, number>()
  for (const t of objetivo.terminos) {
    const g = gradoDeTermino(t)
    if (g === null) continue // término ya opaco (disfrazado antes): no se cuenta, se preserva tal cual abajo
    porGrado.set(g, (porGrado.get(g) ?? 0) + coeficienteDeTermino(t))
  }

  const b = porGrado.get(1) ?? 0
  const c = porGrado.get(0) ?? 0

  const signo = rng.randInt(0, 1) === 0 ? 1 : -1
  const a = rng.randIntNoCero(ruidoMin, ruidoMax) * signo
  const m = rng.randIntNoCero(despMin, despMax)

  const bVisible = b - a
  const cVisible = c - a * m

  const terminosPreservados = objetivo.terminos.filter((t) => {
    const g = gradoDeTermino(t)
    return g !== 1 && g !== 0
  })

  const nuevosTerminos: Nodo[] = [...terminosPreservados]
  if (bVisible !== 0) nuevosTerminos.push(prod([num(bVisible), variable('x')]))
  if (cVisible !== 0) nuevosTerminos.push(num(cVisible))
  nuevosTerminos.push(prod([num(a), grupo(suma([variable('x'), num(m)]))]))

  return suma(nuevosTerminos)
}
