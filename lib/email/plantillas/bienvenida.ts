export function plantillaBienvenida(nombre: string) {
  return {
    subject: '¡Bienvenido a ExactaLab! 🎓',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; padding: 40px 20px;">
        <h1 style="color: #eab308; text-align: center; font-size: 24px;">
          Exacta<span style="color: #ffffff;">Lab</span>
        </h1>
        <div style="background-color: #1e293b; border-radius: 16px; padding: 32px; margin-top: 24px;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">¡Hola, ${nombre}! 👋</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Tu cuenta en ExactaLab ha sido creada exitosamente. Ya puedes empezar a explorar nuestros cursos de matemáticas, física y cálculo diseñados para llevarte al siguiente nivel.
          </p>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Te recomendamos empezar por los cursos de la <strong style="color: #eab308;">Etapa 0 (Cimientos)</strong> si quieres reforzar las bases antes de avanzar.
          </p>
          <div style="text-align: center; margin-top: 32px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/cursos" style="background-color: #eab308; color: #000000; font-weight: bold; padding: 14px 32px; border-radius: 12px; text-decoration: none; display: inline-block;">
              Explorar cursos
            </a>
          </div>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
          ExactaLab · matematich.club
        </p>
      </div>
    `,
  };
}