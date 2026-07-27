import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre no puede estar vacio' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfil?.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const admin = createAdminSupabaseClient()
    const { data: categoria, error } = await admin
      .from('categorias')
      .insert({ nombre: nombre.trim() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una categoria con ese nombre' }, { status: 409 })
      }
      console.error('Error al crear categoria:', error)
      return NextResponse.json({ error: 'Error al crear la categoria' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, categoria })

  } catch (error) {
    console.error('Error general al crear categoria:', error)
    return NextResponse.json({ error: 'Error al crear la categoria' }, { status: 500 })
  }
}
