import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { enviarEmail } from '@/lib/email/enviar';
import { plantillaBienvenida } from '@/lib/email/plantillas/bienvenida';

export async function POST(request: NextRequest) {
  try {
    // En lugar de confiar en el email/nombre que venga en el body (cualquiera
    // podria inventarlos), verificamos la sesion real del usuario autenticado
    // y tomamos sus datos desde ahi. Esto evita que este endpoint se use como
    // un "email bomb" publico contra terceros usando nuestra cuenta de Resend.
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = user.email;
    const nombre = (user.user_metadata as { nombre?: string } | null)?.nombre || 'nuevo estudiante';

    if (!email) {
      return NextResponse.json({ error: 'El usuario no tiene correo registrado' }, { status: 400 });
    }

    const { subject, html } = plantillaBienvenida(nombre);
    const resultado = await enviarEmail({ to: email, subject, html });

    return NextResponse.json(resultado);

  } catch (err) {
    console.error('[api/email/bienvenida] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}