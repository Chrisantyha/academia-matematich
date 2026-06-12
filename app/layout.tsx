import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ExactaLab — Ciencias Exactas para LATAM',
  description: 'Aprende Matemáticas, Física y Cálculo desde la raíz.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#0B0F1A] text-white`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}