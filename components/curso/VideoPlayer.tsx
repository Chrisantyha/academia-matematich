'use client'

interface VideoPlayerProps {
  videoId: string
  titulo?: string
}

export default function VideoPlayer({ videoId, titulo }: VideoPlayerProps) {
  const subdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_SUBDOMAIN

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden">
      {titulo && (
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">{titulo}</h3>
        </div>
      )}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={`https://${subdomain}.cloudflarestream.com/${videoId}/iframe`}
          className="absolute top-0 left-0 w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}