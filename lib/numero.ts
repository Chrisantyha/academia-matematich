export function parseNumeroOFraccion(valor: string): number | null {
  const texto = valor.trim()
  if (texto === '') return null

  const fraccion = texto.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/)
  if (fraccion) {
    const numerador = parseFloat(fraccion[1])
    const denominador = parseFloat(fraccion[2])
    if (denominador === 0) return null
    return numerador / denominador
  }

  const numero = parseFloat(texto)
  return isNaN(numero) ? null : numero
}
