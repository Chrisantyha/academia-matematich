'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRCertificadoProps {
  url: string
}

export default function QRCertificado({ url }: QRCertificadoProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeSVG
        value={url}
        size={100}
        bgColor="#0f172a"
        fgColor="#F5A623"
        level="H"
      />
      <span className="text-xs text-slate-500">Escanea para verificar</span>
    </div>
  )
}