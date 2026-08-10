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

export async function alternarPublicacionCurso(formData: FormData) {
  if (!(await verificarAdmin('alternarPublicacionCurso'))) return

  const cursoId = formData.get('cursoId') as string
  const estadoActual = formData.get('estadoActual') as string

  const nuevoEstado = estadoActual === 'publicado' ? 'borrador' : 'publicado'

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('cursos').update({ estado: nuevoEstado }).eq('id', cursoId)

  if (error) {
    console.error('alternarPublicacionCurso: error al actualizar el estado', error)
    return
  }

  revalidatePath('/admin')
}