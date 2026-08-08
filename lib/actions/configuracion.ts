'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'

export async function actualizarConfiguracionOfertas(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const perfil = await getPerfil(user.id)
  if (perfil?.rol !== 'admin') {
    console.error('actualizarConfiguracionOfertas: intento no autorizado', { userId: user.id })
    return
  }

  const descuento = Number(formData.get('descuento'))
  const minCursos = Number(formData.get('minCursos'))

  if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100) {
    console.error('actualizarConfiguracionOfertas: descuento invalido', descuento)
    return
  }

  if (!Number.isInteger(minCursos) || minCursos < 2) {
    console.error('actualizarConfiguracionOfertas: minCursos invalido', minCursos)
    return
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('configuracion_ofertas')
    .update({
      descuento_paquete_porcentaje: descuento,
      paquete_min_cursos: minCursos,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) {
    console.error('actualizarConfiguracionOfertas: error al actualizar', error)
    return
  }

  revalidatePath('/admin/ofertas')
  revalidatePath('/cursos')
}
