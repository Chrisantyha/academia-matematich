import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

// Endpoint de solo lectura, publico: expone el % de descuento y el minimo
// de cursos vigente para armar un paquete. No requiere autenticacion porque
// es informacion no sensible (se necesita para mostrar el calculo en el
// catalogo antes de que el alumno inicie sesion o compre).
export async function GET() {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('configuracion_ofertas')
      .select('descuento_paquete_porcentaje, paquete_min_cursos')
      .eq('id', 1)
      .single()

    if (error || !data) {
      return NextResponse.json({ descuento: 0, minimo: 999 })
    }

    return NextResponse.json({
      descuento: Number(data.descuento_paquete_porcentaje),
      minimo: Number(data.paquete_min_cursos),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ descuento: 0, minimo: 999 })
  }
}