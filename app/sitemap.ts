import type { MetadataRoute } from 'next'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { appUrl } from '@/lib/url'

// Se regenera como máximo una vez por hora, para que un curso recién
// publicado aparezca sin tener que volver a desplegar.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl()

  const paginas: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/cursos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/kids`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/kids/cursos`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/bachillerato`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/bachillerato/cursos`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/universitario`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/universitario/cursos`, changeFrequency: 'daily', priority: 0.8 },
  ]

  // Solo los cursos publicados. Si la consulta falla, el sitemap sale igual
  // con las páginas fijas en vez de romper la compilación o devolver error.
  try {
    const admin = createAdminSupabaseClient()
    const { data: cursos, error } = await admin
      .from('cursos')
      .select('id, created_at')
      .eq('estado', 'publicado')

    if (error) {
      console.error('sitemap: error al listar cursos', error)
      return paginas
    }

    for (const curso of cursos || []) {
      paginas.push({
        url: `${base}/cursos/${curso.id}`,
        lastModified: curso.created_at ? new Date(curso.created_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  } catch (err) {
    console.error('sitemap: error inesperado', err)
  }

  return paginas
}
