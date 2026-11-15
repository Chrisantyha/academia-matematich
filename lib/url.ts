// URL pública de la app, para armar enlaces absolutos (retorno de pagos,
// certificados, correos). En producción manda NEXT_PUBLIC_APP_URL; en local
// (next dev) manda NEXT_PUBLIC_APP_URL_LOCAL. Cada una cae en la otra si
// falta, para que nunca quede "undefined" pegado en una URL.
export function appUrl(): string {
  const produccion = process.env.NEXT_PUBLIC_APP_URL
  const local = process.env.NEXT_PUBLIC_APP_URL_LOCAL

  const url = process.env.NODE_ENV === 'production'
    ? (produccion || local)
    : (local || produccion)

  return (url || 'http://localhost:3000').replace(/\/+$/, '')
}
