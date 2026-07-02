import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('cursos')
      .select(`
        *,
        perfiles (nombre)
      `)
      .eq('publicado', true)
      .order('created_at', { ascending: false })

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