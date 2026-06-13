import { NextResponse } from 'next/server'

export async function GET() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  )

  const data = await response.json()

  if (data.success) {
    return NextResponse.json({ ok: true, mensaje: 'Cloudflare Stream conectado correctamente' })
  } else {
    return NextResponse.json({ ok: false, error: data.errors })
  }
}