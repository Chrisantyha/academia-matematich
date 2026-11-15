import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/url'

// Qué pueden rastrear los buscadores: el catálogo y las fichas de curso sí;
// los paneles privados, las rutas internas y los flujos de pago no.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/docente',
          '/alumno',
          '/api/',
          '/auth/',
          '/pago/',
          '/evaluacion/',
          '/actualizar-password',
          '/recuperar-password',
        ],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  }
}
