import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const nivel = searchParams.get('nivel')

    let query = supabase
      .from('cursos')
      .select(`
        *,
        perfiles (nombre)
      `)
      .or('estado.eq.publicado,visible_proximamente.eq.true')
      .order('orden', { ascending: true })

    // Filtro opcional por bloque/nivel. "universitario" incluye tambien
    // "posgrado" (mismo bloque de marca ExactaLab Universitario).
    if (nivel === 'universitario') {
      query = query.in('nivel', ['universitario', 'posgrado'])
    } else if (nivel === 'bachillerato') {
      query = query.eq('nivel', 'bachillerato')
    } else if (nivel === 'kids') {
      query = query.eq('nivel', 'kids')
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return NextResponse.json([], { status: 500 })
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error(error)
    return NextResponse.json([], { status: 500 })
  }
}