import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { appUrl } from '@/lib/url'

const inter = Inter({ subsets: ['latin'] })

const TITULO = 'ExactaLab — Ciencias Exactas para LATAM'
const DESCRIPCION =
  'Cursos de Matemáticas, Física y Cálculo en video, explicados paso a paso, para escuela, colegio y universidad.'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  // Las páginas que definen su propio título quedan como "Título · ExactaLab".
  title: { default: TITULO, template: '%s · ExactaLab' },
  description: DESCRIPCION,
  applicationName: 'ExactaLab',
  openGraph: {
    type: 'website',
    siteName: 'ExactaLab',
    locale: 'es_EC',
    title: TITULO,
    description: DESCRIPCION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO,
    description: DESCRIPCION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-white`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}