import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Falta RESEND_API_KEY en las variables de entorno');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = 'ExactaLab <noreply@matematich.club>';
export const EMAIL_REPLY_TO = 'matematichcsg@gmail.com';
