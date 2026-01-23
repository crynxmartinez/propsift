import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'PropSift <admin@propsift.site>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propsift.site'

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verificationUrl = `${APP_URL}/verify?token=${token}`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Activate your PropSift account',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                PropSift
              </h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">
                RE Data Intelligence
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 22px; font-weight: 600;">
                Welcome to PropSift! 🎉
              </h2>
              <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Thanks for signing up. Click the button below to activate your account and start using PropSift.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${verificationUrl}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Activate My Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                This link expires in <strong style="color: #cbd5e1;">24 hours</strong>.
              </p>
              
              <p style="margin: 16px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; color: #60a5fa; font-size: 12px; word-break: break-all;">
                ${verificationUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0f172a; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                If you didn't create a PropSift account, you can safely ignore this email.
              </p>
              <p style="margin: 12px 0 0; color: #475569; font-size: 12px; text-align: center;">
                © 2026 PropSift. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

export function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function getVerificationExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 24) // 24 hours from now
  return expiry
}
