// src/lib/mail.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT ?? '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendResetCode({
  to,
  nom,
  code,
}: {
  to: string
  nom: string
  code: string
}) {
  await transporter.sendMail({
    from:    process.env.SMTP_FROM,
    to,
    subject: '🔐 Réinitialisation de votre mot de passe — GénieBulletin',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 12px;">
        <h2 style="color: #1a6b3a;">📚 GénieBulletin</h2>
        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :</p>

        <div style="background: #f4f4f4; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; text-align: center;">
          <span style="font-size: 2.5rem; font-weight: bold; color: #1a6b3a; letter-spacing: 8px;">
            ${code}
          </span>
        </div>

        <p style="color: #e74c3c;"><strong>⚠️ Ce code expire dans 15 minutes.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>

        <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="font-size: 0.75rem; color: #999;">Cet email a été envoyé automatiquement par GénieBulletin. Ne pas répondre.</p>
      </div>
    `,
  })
}