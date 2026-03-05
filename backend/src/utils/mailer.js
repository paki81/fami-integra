const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const FROM = process.env.SMTP_FROM || 'FAMI INTEGRA <noreply@fami-integra.it>';

async function sendMail(to, subject, html) {
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`Email inviata a ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('Errore invio email:', err.message);
    throw err;
  }
}

function resetPasswordTemplate(nome, resetUrl) {
  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0;">
  <div style="max-width: 520px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #166534, #15803d); padding: 32px 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px;">FAMI INTEGRA</h1>
      <p style="color: #bbf7d0; margin: 6px 0 0; font-size: 13px;">Piattaforma Centro Sportello</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Ciao <strong>${nome}</strong>,
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Hai richiesto il ripristino della password del tuo account. 
        Clicca il pulsante qui sotto per impostare una nuova password:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #166534; color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Reimposta Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        Il link è valido per <strong>1 ora</strong>. Se non hai richiesto tu il ripristino, ignora questa email.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
        <a href="${resetUrl}" style="color: #166534; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
    <div style="background: #f9fafb; padding: 16px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} FAMI INTEGRA - Cooperativa Sociale Aladino</p>
    </div>
  </div>
</body>
</html>`;
}

function notificaTemplate(nome, titolo, messaggio) {
  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0;">
  <div style="max-width: 520px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #166534, #15803d); padding: 32px 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px;">FAMI INTEGRA</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 15px;">Ciao <strong>${nome}</strong>,</p>
      <h2 style="color: #111827; font-size: 17px; margin: 16px 0 8px;">${titolo}</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">${messaggio}</p>
    </div>
    <div style="background: #f9fafb; padding: 16px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} FAMI INTEGRA</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { sendMail, resetPasswordTemplate, notificaTemplate, transporter };
