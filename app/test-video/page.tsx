import VideoPlayer from '@/components/curso/VideoPlayer'

export default function TestVideo() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        <h1 className="text-white text-2xl font-bold mb-6">Prueba de Video</h1>
        <VideoPlayer
          videoId="e94b00e4dcf7674678457e88d01fd13b"
          titulo="Video de prueba"
        />
      </div>
    </main>
  )
}