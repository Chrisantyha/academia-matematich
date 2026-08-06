import https from 'https'

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN

export function consultarPayphone(clientTransactionId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ clientTxId: clientTransactionId })

    const options = {
      hostname: 'pay.payphonetodoesposible.com',
      path: '/api/button/V2/Confirm',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${PAYPHONE_TOKEN}`,
      },
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => { responseData += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData))
        } catch {
          resolve({ error: responseData })
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}
