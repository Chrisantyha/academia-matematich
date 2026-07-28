'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'

export async function aprobarCurso(formData: FormData) {
  const cursoId = formData.get('cursoId') as string
  const supabase = await createServerSupabaseClient()
  const { data: { user: solicitante } } = await supabase.auth.getUser()

  if (!solicitante) return

  const perfilSolicitante = await getPerfil(solicitante.id)
  if (perfilSolicitante?.rol !== 'admin') {
    console.error('aprobarCurso: intento no autorizado', { userId: solicitante.id })
    return
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('cursos').update({ estado: 'publicado' }).eq('id', cursoId)

  if (error) {
    console.error('aprobarCurso: error al aprobar el curso', error)
    return
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/curso/${cursoId}`)
  redirect('/admin')
}
