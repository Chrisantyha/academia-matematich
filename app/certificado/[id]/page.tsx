import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import BotonImprimir from '@/components/ui/BotonImprimir'
import QRCertificado from '@/components/ui/QRCertificado'

export default async function CertificadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: certificado } = await supabase
    .from('certificados')
    .select(`
      *,
      perfiles (nombre),
      cursos (titulo, categoria)
    `)
    .eq('id', id)
    .single()

  if (!certificado) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🎓</div>
          <h1 className="text-2xl font-bold mb-2">Certificado no encontrado</h1>
          <p className="text-slate-400">Este certificado no existe o no es valido.</p>
        </div>
      </main>
    )
  }

  const fecha = new Date(certificado.fecha_emision).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const urlCertificado = `https://academia-matematich.vercel.app/certificado/${id}`

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-3xl">

        {/* CERTIFICADO */}
        <div className="bg-slate-900 border-2 border-yellow-500/50 rounded-3xl p-12 text-center relative overflow-hidden">

          {/* DECORACION FONDO */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-8 left-8 text-8xl">∫</div>
            <div className="absolute top-8 right-8 text-8xl">∑</div>
            <div className="absolute bottom-8 left-8 text-8xl">π</div>
            <div className="absolute bottom-8 right-8 text-8xl">∞</div>
          </div>

          {/* CONTENIDO */}
          <div className="relative z-10">

            <div className="text-6xl mb-4">🎓</div>

            <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-4">
              Certificado de Completacion
            </div>

            <h1 className="text-2xl font-bold mb-2 text-slate-300">
              Este certificado se otorga a
            </h1>

            <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
              {certificado.perfiles?.nombre || 'Estudiante'}
            </h2>

            <p className="text-slate-400 mb-2">
              por haber completado exitosamente el curso
            </p>

            <h3 className="text-2xl font-bold text-yellow-500 mb-2">
              {certificado.cursos?.titulo}
            </h3>

            <p className="text-slate-500 text-sm mb-8">
              {certificado.cursos?.categoria} · ExactaLab
            </p>

            <div className="border-t border-slate-700 pt-8 mt-8">
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="text-left">
                  <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                    Fecha de emision
                  </div>
                  <div className="text-sm font-semibold">{fecha}</div>
                </div>

                {/* QR */}
                <QRCertificado url={urlCertificado} />

                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                    Codigo de verificacion
                  </div>
                  <div className="font-mono text-yellow-500 font-bold text-lg">
                    {certificado.codigo_verificacion}
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest mt-3 mb-1">
                    Emitido por
                  </div>
                  <div className="text-sm font-bold">
                    Exacta<span className="text-yellow-500">Lab</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex gap-4 justify-center mt-8 flex-wrap">
          <BotonImprimir />
          <Link
            href="/alumno"
            className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Volver al dashboard
          </Link>
        </div>

        {/* VERIFICACION */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-xs">
            Este certificado puede verificarse en{' '}
            <span className="text-yellow-500">{urlCertificado}</span>
          </p>
        </div>

      </div>
    </main>
  )
}