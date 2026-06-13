import { createServerSupabaseClient } from '@/lib/supabase-server'


// ── CURSOS ──
export async function getCursos() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cursos')
    .select(`
      *,
      perfiles (nombre, avatar_url)
    `)
    .eq('publicado', true)
    .order('created_at', { ascending: false })

  if (error) console.error(error)
  return data || []
}

export async function getCursoPorId(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cursos')
    .select(`
      *,
      perfiles (nombre, avatar_url),
      lecciones (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('ERROR COMPLETO:', JSON.stringify(error))
    console.error('ID buscado:', id)
  }
  return data
}

// ── PERFIL ──
export async function getPerfil(userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) console.error(error)
  return data
}

// ── ROL DEL USUARIO ──
export async function getRolUsuario() {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (error) console.error(error)
  return data?.rol || 'alumno'
}

export async function actualizarPerfil(userId: string, datos: {
  nombre?: string
  avatar_url?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('perfiles')
    .update(datos)
    .eq('id', userId)

  if (error) console.error(error)
}

// ── COMPRAS ──
export async function getComprasAlumno(alumnoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('compras')
    .select(`
      *,
      cursos (titulo, imagen_url)
    `)
    .eq('alumno_id', alumnoId)

  if (error) console.error(error)
  return data || []
}

export async function alumnoTieneCurso(alumnoId: string, cursoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('compras')
    .select('id')
    .eq('alumno_id', alumnoId)
    .eq('curso_id', cursoId)
    .single()

  return !!data
}

// ── PROGRESO ──
export async function getProgreso(alumnoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('progreso')
    .select(`
      *,
      lecciones (titulo, curso_id)
    `)
    .eq('alumno_id', alumnoId)
    .eq('completado', true)

  if (error) console.error(error)
  return data || []
}

export async function marcarLeccionCompletada(alumnoId: string, leccionId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('progreso')
    .upsert({
      alumno_id: alumnoId,
      leccion_id: leccionId,
      completado: true
    })

  if (error) console.error(error)
}

// ── LECCIONES ──
export async function getLeccionesPorCurso(cursoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('lecciones')
    .select('*')
    .eq('curso_id', cursoId)
    .order('orden', { ascending: true })

  if (error) console.error(error)
  return data || []
}