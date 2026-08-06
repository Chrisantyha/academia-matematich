import https from 'https'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN

export function consultarPayphone(clientTransactionId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Integramos con "Links de Pago" (API Link), no con el Boton de Pago, asi
    // que la consulta de estado es API Sale: GET /api/Sale/client/{id}, sin
    // body -- no el POST /api/button/V2/Confirm que exige un "id" numerico.
    const options = {
      hostname: 'pay.payphonetodoesposible.com',
      path: `/api/Sale/client/${encodeURIComponent(clientTransactionId)}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
      },
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => { responseData += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          // API Sale devuelve la transaccion envuelta en un arreglo (a
          // diferencia del Boton de Pago), asi que se desenvuelve aca para
          // que el resto del codigo pueda seguir leyendo resultado.campo
          // directo sin saber de este detalle.
          if (Array.isArray(parsed)) {
            resolve(parsed[0] ?? {})
          } else {
            resolve(parsed)
          }
        } catch {
          resolve({ error: responseData })
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}
