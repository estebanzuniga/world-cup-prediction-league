import { Resend } from 'resend'

function getClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.')
  return new Resend(apiKey)
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'Goalcaster <onboarding@resend.dev>'

  const { error } = await getClient().emails.send({
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

  if (error) throw new Error(`Failed to send email: ${error.message}`)
}
