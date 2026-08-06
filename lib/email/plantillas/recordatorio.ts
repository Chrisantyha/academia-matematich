export function plantillaRecordatorio(nombreCurso: string) {
  return {
    subject: `¿Seguimos con ${nombreCurso}? 📚`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; padding: 40px 20px;">
        <h1 style="color: #eab308; text-align: center; font-size: 24px;">
          Exacta<span style="color: #ffffff;">Lab</span>
        </h1>
        <div style="background-color: #1e293b; border-radius: 16px; padding: 32px; margin-top: 24px;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Te extrañamos por aquí 👋</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Notamos que llevas un tiempo sin avanzar en <strong style="color: #eab308;">${nombreCurso}</strong>. ¡No pierdas el ritmo! Retomar ahora te va a costar menos que empezar de cero después.
          </p>
          <div style="text-align: center; margin-top: 32px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/mis-cursos" style="background-color: #eab308; color: #000000; font-weight: bold; padding: 14px 32px; border-radius: 12px; text-decoration: none; display: inline-block;">
              Continuar mi curso
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