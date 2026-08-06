import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from './resend';

interface EnviarEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function enviarEmail({ to, subject, html }: EnviarEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      replyTo: EMAIL_REPLY_TO,
    });

    if (error) {
      console.error('[email] Error enviando correo:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[email] Excepción enviando correo:', err);
    return { success: false, error: err };
  }
}
