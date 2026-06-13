import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const video = formData.get('video') as File
    const titulo = formData.get('titulo') as string

    if (!video) {
      return NextResponse.json({ error: 'No se recibio video' }, { status: 400 })
    }

    // Crear upload directo en Cloudflare Stream
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600,
          meta: { name: titulo },
          requireSignedURLs: true,
        }),
      }
    )

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ error: data.errors }, { status: 500 })
    }

    // Subir video al URL de Cloudflare
    const uploadForm = new FormData()
    uploadForm.append('file', video)

    await fetch(data.result.uploadURL, {
      method: 'POST',
      body: uploadForm,
    })

    return NextResponse.json({
      ok: true,
      videoId: data.result.uid,
      playbackUrl: `https://${process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${data.result.uid}/manifest/video.m3u8`,
    })

  } catch (error) {
    return NextResponse.json({ error: 'Error al subir video' }, { status: 500 })
  }
}