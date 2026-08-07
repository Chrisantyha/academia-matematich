'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'

async function verificarAdmin(nombreAccion: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user: solicitante } } = await supabase.auth.getUser()

  if (!solicitante) return false

  const perfilSolicitante = await getPerfil(solicitante.id)
  if (perfilSolicitante?.rol !== 'admin') {
    console.error(`${nombreAccion}: intento no autorizado`, { userId: solicitante.id })
    return false
  }

  return true
}

export async function revocarCompra(formData: FormData) {
  if (!(await verificarAdmin('revocarCompra'))) return

  const compraId = formData.get('compraId') as string
  const alumnoId = formData.get('alumnoId') as string

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('compras').update({ estado: 'revocado' }).eq('id', compraId)

  if (error) {
    console.error('revocarCompra: error al revocar la compra', error)
    return
  }

  revalidatePath(`/admin/usuarios/${alumnoId}`)
}

export async function resetearIntentoExamen(formData: FormData) {
  if (!(await verificarAdmin('resetearIntentoExamen'))) return

  const intentoId = formData.get('intentoId') as string
  const alumnoId = formData.get('alumnoId') as string

  const admin = createAdminSupabaseClient()

  const { error: errorResultados } = await admin
    .from('resultados_evaluacion')
    .delete()
    .eq('intento_id', intentoId)

  if (errorResultados) {
    console.error('resetearIntentoExamen: error al borrar el resultado', errorResultados)
    return
  }

  const { error: errorIntento } = await admin.from('intentos').delete().eq('id', intentoId)

  if (errorIntento) {
    console.error('resetearIntentoExamen: error al borrar el intento', errorIntento)
    return
  }

  revalidatePath(`/admin/usuarios/${alumnoId}`)
}

export async function resetearProgresoCurso(formData: FormData) {
  if (!(await verificarAdmin('resetearProgresoCurso'))) return

  const alumnoId = formData.get('alumnoId') as string
  const cursoId = formData.get('cursoId') as string

  const admin = createAdminSupabaseClient()

  const { data: lecciones, error: errorLecciones } = await admin
    .from('lecciones')
    .select('id')
    .eq('curso_id', cursoId)

  if (errorLecciones) {
    console.error('resetearProgresoCurso: error al traer las lecciones del curso', errorLecciones)
    return
  }

  const leccionIds = (lecciones || []).map((l) => l.id)
  if (leccionIds.length === 0) return

  const { error: errorProgreso } = await admin
    .from('progreso')
    .delete()
    .eq('alumno_id', alumnoId)
    .in('leccion_id', leccionIds)

  if (errorProgreso) {
    console.error('resetearProgresoCurso: error al borrar el progreso', errorProgreso)
    return
  }

  revalidatePath(`/admin/usuarios/${alumnoId}`)
}
