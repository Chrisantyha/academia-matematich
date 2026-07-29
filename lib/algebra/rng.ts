// RNG desacoplado del resto del código: lib/algebra/ no depende de
// lib/plantillas.ts (la dependencia va al revés: plantillas.ts importará de
// aquí). Se inyecta como parámetro en cada técnica para poder usar una
// semilla determinista en tests/verificación sin tocar Math.random.

export interface Rng {
  randInt(min: number, max: number): number
  randIntNoCero(min: number, max: number): number
}

function randIntPuro(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randIntNoCeroPuro(min: number, max: number): number {
  for (let i = 0; i < 200; i++) {
    const n = randIntPuro(min, max)
    if (n !== 0) return n
  }
  throw new Error('Rng: no se pudo generar un valor distinto de cero en el rango dado')
}

export const rngPorDefecto: Rng = {
  randInt: randIntPuro,
  randIntNoCero: randIntNoCeroPuro,
}

// Rng determinista (LCG simple) para tests/verificación reproducible.
export function crearRngConSemilla(semilla: number): Rng {
  let estado = semilla >>> 0
  const siguiente = (): number => {
    // constantes de Numerical Recipes; alcanza para no depender de Math.random
    estado = (estado * 1664525 + 1013904223) >>> 0
    return estado / 0xffffffff
  }
  const randInt = (min: number, max: number): number => Math.floor(siguiente() * (max - min + 1)) + min
  const randIntNoCero = (min: number, max: number): number => {
    for (let i = 0; i < 200; i++) {
      const n = randInt(min, max)
      if (n !== 0) return n
    }
    throw new Error('Rng: no se pudo generar un valor distinto de cero en el rango dado')
  }
  return { randInt, randIntNoCero }
}
