import { NextRequest, NextResponse } from 'next/server';
import { enviarEmail } from '@/lib/email/enviar';
import { plantillaBienvenida } from '@/lib/email/plantillas/bienvenida';

export async function POST(request: NextRequest) {
  try {
    const { email, nombre } = await request.json();

    if (!email || !nombre) {
      return NextResponse.json({ error: 'Faltan datos (email o nombre)' }, { status: 400 });
    }

    const { subject, html } = plantillaBienvenida(nombre);
    const resultado = await enviarEmail({ to: email, subject, html });

    return NextResponse.json(resultado);
  } catch (err) {
    console.error('[api/email/bienvenida] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}