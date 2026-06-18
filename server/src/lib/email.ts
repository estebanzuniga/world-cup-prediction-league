import { BrevoClient } from '@getbrevo/brevo'

function getClient() {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured.')
  return new BrevoClient({ apiKey })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM ?? 'noreply@goalcaster.com'

  await getClient().transactionalEmails.sendTransacEmail({
    sender: { name: 'Goalcaster', email: fromEmail },
    to: [{ email: to }],
    subject: 'Restablece tu contraseña — Goalcaster',
    textContent: `Hola,\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace (válido por 1 hora):\n${resetUrl}\n\nSi no solicitaste esto, ignora este mensaje.\n\n— Goalcaster`,
    htmlContent: `
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
