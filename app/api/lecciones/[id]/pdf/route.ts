import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { tieneAccesoCurso } from '@/lib/acceso'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = createAdminSupabaseClient()

    const { data: leccion } = await admin
      .from('lecciones')
      .select('id, curso_id, pdf_url')
      .eq('id', id)
      .single()

    if (!leccion || !leccion.pdf_url) {
      return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })
    }

    const tieneAcceso = await tieneAccesoCurso(supabase, user.id, leccion.curso_id, {
      permitirDocenteAdmin: true,
    })

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: firmada, error: signError } = await admin.storage
      .from('materiales')
      .createSignedUrl(leccion.pdf_url, 60)

    if (signError || !firmada) {
      console.error('Error al firmar URL de material:', signError)
      return NextResponse.json({ error: 'Error al generar el enlace' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, url: firmada.signedUrl })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error al obtener el material' }, { status: 500 })
  }
}
