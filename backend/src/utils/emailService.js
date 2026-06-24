/**
 * utils/emailService.js
 * Resend email service for TaskFlow.
 *
 * Environment variables required:
 *   RESEND_API_KEY  — API key from resend.com
 *   EMAIL_FROM      — From address (e.g. TaskFlow <noreply@yourdomain.com>)
 *   CLIENT_URL      — Frontend URL for login link
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function verifyConnection() {
  try {
    // Resend has no verify() — just check the key exists
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    console.log('✅  Email service ready (Resend)');
  } catch (err) {
    console.warn('⚠️   Email service not configured:', err.message);
  }
}

async function sendWelcomeEmail({ name, email, roleName, temporaryPassword }) {
  const loginUrl = `${process.env.CLIENT_URL}/login`;

  await resend.emails.send({
    from:    process.env.EMAIL_FROM || 'TaskFlow <onboarding@resend.dev>',
    to:      email,
    subject: 'Welcome to TaskFlow',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; background: #f7f0fc; margin: 0; padding: 32px 16px; }
          .card { background: #ffffff; border-radius: 12px; padding: 40px; max-width: 520px; margin: 0 auto; }
          .logo { font-size: 24px; font-weight: 700; color: #7300C0; margin-bottom: 24px; }
          .logo span { color: #1a0a2e; }
          h2 { color: #1a0a2e; font-size: 20px; margin: 0 0 16px; }
          p { color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
          .info-box { background: #f4effe; border-radius: 8px; padding: 20px; margin: 24px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e0d0f5; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #9882b0; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .info-value { color: #1a0a2e; font-size: 14px; font-weight: 600; }
          .password-box { background: #1a0a2e; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 16px 0; }
          .password-text { color: #B982DF; font-size: 22px; font-family: 'Courier New', monospace; letter-spacing: 3px; }
          .btn { display: inline-block; background: #7300C0; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 24px 0; }
          .warning { background: #FFF8E1; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #7B5800; }
          .footer { text-align: center; color: #aaa; font-size: 12px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Task<span>Flow</span></div>
          <h2>Welcome to TaskFlow, ${name}!</h2>
          <p>Your account has been created. Below are your login details.</p>
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Name</span>
              <span class="info-value">${name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">${email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Role</span>
              <span class="info-value">${roleName}</span>
            </div>
          </div>
          <p>Your temporary password:</p>
          <div class="password-box">
            <div class="password-text">${temporaryPassword}</div>
          </div>
          <a href="${loginUrl}" class="btn">Log in to TaskFlow</a>
          <div class="warning">
            ⚠️ You will be required to set a new password immediately after your first login.
            Do not share this temporary password with anyone.
          </div>
          <div class="footer">
            This email was sent by TaskFlow &mdash; INTE 21323 Project.<br />
            If you did not expect this email, please contact your administrator.
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

async function sendPasswordResetEmail({ name, email, temporaryPassword }) {
  const loginUrl = `${process.env.CLIENT_URL}/login`;

  await resend.emails.send({
    from:    process.env.EMAIL_FROM || 'TaskFlow <onboarding@resend.dev>',
    to:      email,
    subject: 'TaskFlow Password Reset',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; background: #f7f0fc; margin: 0; padding: 32px 16px; }
          .card { background: #ffffff; border-radius: 12px; padding: 40px; max-width: 520px; margin: 0 auto; }
          .logo { font-size: 24px; font-weight: 700; color: #7300C0; margin-bottom: 24px; }
          .logo span { color: #1a0a2e; }
          h2 { color: #1a0a2e; font-size: 20px; margin: 0 0 16px; }
          p { color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
          .password-box { background: #1a0a2e; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 16px 0; }
          .password-text { color: #B982DF; font-size: 22px; font-family: 'Courier New', monospace; letter-spacing: 3px; }
          .btn { display: inline-block; background: #7300C0; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 24px 0; }
          .steps { background: #f4effe; border-radius: 8px; padding: 20px; margin: 24px 0; }
          .steps ol { margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 2; }
          .warning { background: #FFEBEE; border-left: 4px solid #ef5350; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #B71C1C; }
          .footer { text-align: center; color: #aaa; font-size: 12px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Task<span>Flow</span></div>
          <h2>Password Reset Request</h2>
          <p>Hi ${name}, a password reset was requested for your TaskFlow account.</p>
          <p>Your new temporary password:</p>
          <div class="password-box">
            <div class="password-text">${temporaryPassword}</div>
          </div>
          <div class="steps">
            <ol>
              <li>Click the button below to go to the login page</li>
              <li>Enter your email and this temporary password</li>
              <li>You will be asked to set a new permanent password immediately</li>
            </ol>
          </div>
          <a href="${loginUrl}" class="btn">Log in to TaskFlow</a>
          <div class="warning">
            If you did not request a password reset, contact your administrator immediately.
            Do not share this temporary password with anyone.
          </div>
          <div class="footer">
            This email was sent by TaskFlow &mdash; INTE 21323 Project.
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

module.exports = { verifyConnection, sendWelcomeEmail, sendPasswordResetEmail };