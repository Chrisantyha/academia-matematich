'use client'

import { useState } from 'react'
import * as tus from 'tus-js-client'

interface VideoUploadProps {
  cursoId: string
  moduloId?: string
  orden?: number
  onSuccess: (videoId: string) => void
}

export default function VideoUpload({ cursoId, moduloId, orden, onSuccess }: VideoUploadProps) {
  const [tipo, setTipo] = useState<'video' | 'pdf'>('video')
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

  function subirACloudflare(uploadURL: string, video: File): Promise<void> {
    return new Promise((resolve, reject) => {
      // uploadURL ya es un endpoint TUS creado por Cloudflare (/stream/direct_upload):
      // se usa uploadUrl para que tus-js-client no intente crear el upload de nuevo,
      // solo haga los PATCH de los chunks.
      const upload = new tus.Upload(video, {
        uploadUrl: uploadURL,
        // Cloudflare exige que el chunk sea multiplo de 256 KiB; 50 MiB lo cumple.
        chunkSize: 50 * 1024 * 1024,
        retryDelays: [0, 1000, 3000, 5000],
        // El backend genera una uploadUrl nueva en cada intento (POST a
        // /api/upload-video), asi que no queremos que tus-js-client guarde ni
        // reutilice URLs viejas por fingerprint via localStorage.
        storeFingerprintForResuming: false,
        onProgress: (bytesSubidos, bytesTotal) => {
          // 0-10% pedir la URL, 10-90% subida real, 90-100% guardar en la BD
          setProgreso(10 + Math.round((bytesSubidos / bytesTotal) * 80))
        },
        onSuccess: () => resolve(),
        onError: (error) => reject(error instanceof Error ? error : new Error(String(error))),
      })

      upload.start()
    })
  }

  async function handleUploadPdf() {
    if (!archivo) {
      setError('Selecciona un PDF primero')
      return
    }
    if (!titulo) {
      setError('Escribe el título de la lección')
      return
    }

    setUploading(true)
    setError('')
    setProgreso(20)

    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      formData.append('titulo', titulo)
      formData.append('cursoId', cursoId)
      formData.append('moduloId', moduloId || '')
      formData.append('orden', String(orden || 1))
      formData.append('esGratis', String(esGratis))

      setProgreso(50)

      const respuesta = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      const datos = await respuesta.json()

      if (!datos.ok) {
        setError(datos.error || 'Error al subir el material. Intenta de nuevo.')
        setUploading(false)
        return
      }

      setProgreso(100)
      onSuccess(datos.leccionId)
      setTitulo('')
      setArchivo(null)
      setProgreso(0)

    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleUpload() {
    if (tipo === 'pdf') {
      await handleUploadPdf()
      return
    }

    if (!archivo) {
      setError('Selecciona un video primero')
      return
    }
    if (!titulo) {
      setError('Escribe el título de la lección')
      return
    }

    setUploading(true)
    setError('')
    setProgreso(5)

    try {
      // Paso 1: pedir a nuestro backend una URL de subida directa a Cloudflare Stream
      // (el tamano es obligatorio: Cloudflare lo necesita como Upload-Length
      // al crear el upload TUS, antes de que se suba ningun byte)
      const creacion = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, tamano: archivo.size }),
      })

      const datosCreacion = await creacion.json()

      if (!datosCreacion.ok) {
        setError('Error al iniciar la subida. Intenta de nuevo.')
        setUploading(false)
        return
      }

      setProgreso(10)

      // Paso 2: subir el archivo directo a Cloudflare desde el navegador
      // (ya no pasa por nuestro backend, evita el limite de tamano de Vercel)
      await subirACloudflare(datosCreacion.uploadURL, archivo)

      setProgreso(90)

      // Paso 3: guardar la leccion en nuestra base de datos
      const guardado = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guardar',
          videoId: datosCreacion.videoId,
          titulo,
          cursoId,
          moduloId: moduloId || '',
          orden: orden || 1,
          esGratis,
        }),
      })

      const datosGuardado = await guardado.json()

      if (!datosGuardado.ok) {
        setError('El video se subió pero no se pudo guardar la lección. Contacta soporte.')
        setUploading(false)
        return
      }

      setProgreso(100)
      onSuccess(datosGuardado.videoId)
      setTitulo('')
      setArchivo(null)
      setProgreso(0)

    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h4 className="text-sm font-bold mb-4">Subir nueva lección</h4>

      <div className="mb-4 flex gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1">
        <button
          type="button"
          onClick={() => { setTipo('video'); setArchivo(null); setError('') }}
          className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
            tipo === 'video'
              ? 'bg-yellow-500 text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🎬 Video
        </button>
        <button
          type="button"
          onClick={() => { setTipo('pdf'); setArchivo(null); setError('') }}
          className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
            tipo === 'pdf'
              ? 'bg-yellow-500 text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📄 Solo material (PDF)
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Título de la lección
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Introducción a los límites"
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
          <span className="text-sm text-slate-300">Esta lección es gratis (visible sin comprar)</span>
        </label>
      </div>

      <div className="mb-5">
        <label className="block border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-yellow-500/50 transition-colors cursor-pointer">
          <input
            type="file"
            accept={tipo === 'video' ? 'video/*' : 'application/pdf'}
            onChange={handleArchivo}
            className="hidden"
          />
          {archivo ? (
            <div>
              <div className="text-3xl mb-2">{tipo === 'video' ? '🎬' : '📄'}</div>
              <div className="text-white font-semibold text-sm">{archivo.name}</div>
              <div className="text-slate-500 text-xs mt-1">
                {(archivo.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : tipo === 'video' ? (
            <div>
              <div className="text-3xl mb-2">☁️</div>
              <div className="text-slate-400 text-sm">
                Arrastra tu video o{' '}
                <span className="text-yellow-500 font-semibold">haz click para seleccionar</span>
              </div>
              <div className="text-slate-600 text-xs mt-1">MP4 · máximo 4GB</div>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">☁️</div>
              <div className="text-slate-400 text-sm">
                Arrastra tu PDF o{' '}
                <span className="text-yellow-500 font-semibold">haz click para seleccionar</span>
              </div>
              <div className="text-slate-600 text-xs mt-1">PDF</div>
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
            <span>{tipo === 'video' ? 'Subiendo video...' : 'Subiendo material...'}</span>
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
          {uploading ? 'Subiendo...' : 'Subir lección'}
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