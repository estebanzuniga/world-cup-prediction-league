import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

function getTransporter() {
  const host = process.env.SMTP_HOST
  if (!host) throw new Error('SMTP_HOST is not configured. Add SMTP_* variables to your .env file.')

  const options = {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    family: 4, // force IPv4 — some hosts can't reach SMTP over IPv6
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  } as SMTPTransport.Options

  return nodemailer.createTransport(options)
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER
  const transporter = getTransporter()

  await transporter.sendMail({
    from,
    to,
    subject: 'Restablece tu contraseña — Goalcaster',
    text: `Hola,\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace (válido por 1 hora):\n${resetUrl}\n\nSi no solicitaste esto, ignora este mensaje.\n\n— Goalcaster`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2563eb">⚽ Goalcaster</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Restablecer contraseña
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">El enlace es válido por 1 hora. Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
  })
}
