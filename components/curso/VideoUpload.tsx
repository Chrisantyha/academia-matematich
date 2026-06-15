'use client'

import { useState } from 'react'

interface VideoUploadProps {
  cursoId: string
  moduloId?: string
  orden?: number
  onSuccess: (videoId: string) => void
}

export default function VideoUpload({ cursoId, moduloId, orden, onSuccess }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [titulo, setTitulo] = useState('')
  const [esGratis, setEsGratis] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setArchivo(file)
  }

  async function handleUpload() {
    if (!archivo) {
      setError('Selecciona un video primero')
      return
    }
    if (!titulo) {
      setError('Escribe el titulo de la leccion')
      return
    }

    setUploading(true)
    setError('')
    setProgreso(10)

    try {
      const formData = new FormData()
      formData.append('video', archivo)
      formData.append('titulo', titulo)
      formData.append('cursoId', cursoId)
      formData.append('moduloId', moduloId || '')
      formData.append('orden', String(orden || 1))
      formData.append('esGratis', String(esGratis))

      setProgreso(30)

      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      })

      setProgreso(80)

      const data = await response.json()

      if (!data.ok) {
        setError('Error al subir el video. Intenta de nuevo.')
        setUploading(false)
        return
      }

      setProgreso(100)
      onSuccess(data.videoId)
      setTitulo('')
      setArchivo(null)
      setProgreso(0)

    } catch (err) {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h4 className="text-sm font-bold mb-4">Subir nueva leccion</h4>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Titulo de la leccion
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Introduccion a los limites"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
        />
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={esGratis}
            onChange={(e) => setEsGratis(e.target.checked)}
            className="w-4 h-4 accent-yellow-500"
          />
          <span className="text-sm text-slate-300">Esta leccion es gratis (visible sin comprar)</span>
        </label>
      </div>

      <div className="mb-5">
        <label className="block border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-yellow-500/50 transition-colors cursor-pointer">
          <input
            type="file"
            accept="video/*"
            onChange={handleArchivo}
            className="hidden"
          />
          {archivo ? (
            <div>
              <div className="text-3xl mb-2">🎬</div>
              <div className="text-white font-semibold text-sm">{archivo.name}</div>
              <div className="text-slate-500 text-xs mt-1">
                {(archivo.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">☁️</div>
              <div className="text-slate-400 text-sm">
                Arrastra tu video o{' '}
                <span className="text-yellow-500 font-semibold">haz click para seleccionar</span>
              </div>
              <div className="text-slate-600 text-xs mt-1">MP4 · maximo 4GB</div>
            </div>
          )}
        </label>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Subiendo video...</span>
            <span>{progreso}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-yellow-500 text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors text-sm disabled:opacity-50"
        >
          {uploading ? 'Subiendo...' : 'Subir leccion'}
        </button>
        <button
          onClick={() => { setArchivo(null); setTitulo('') }}
          className="border border-slate-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}