import type { SupabaseClient } from '@supabase/supabase-js'

export async function esDocenteOAdminDelCurso(
  supabase: SupabaseClient,
  userId: string,
  cursoId: string
): Promise<boolean> {
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', userId).single()

  if (perfil?.rol === 'admin') return true

  if (perfil?.rol === 'docente') {
    const { data: curso } = await supabase.from('cursos').select('docente_id').eq('id', cursoId).single()
    if (curso?.docente_id === userId) return true
  }

  return false
}

export async function tieneAccesoCurso(
  supabase: SupabaseClient,
  userId: string,
  cursoId: string,
  opts: { permitirDocenteAdmin?: boolean } = {}
): Promise<boolean> {
  if (opts.permitirDocenteAdmin && await esDocenteOAdminDelCurso(supabase, userId, cursoId)) {
    return true
  }

  const { data: compra } = await supabase
    .from('compras')
    .select('id')
    .eq('alumno_id', userId)
    .eq('curso_id', cursoId)
    .eq('estado', 'aprobado')
    .maybeSingle()

  return !!compra
}
