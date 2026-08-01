const nodemailer = require('nodemailer');
const { getConfig } = require('../routes/config');

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

async function emailLayout(content) {
  const year = new Date().getFullYear();
  const cfg = await getConfig();
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="it">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cfg.app_name}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Segoe UI, Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">
        <!-- HEADER -->
        <tr>
          <td align="center" style="background-color:#166534;padding:28px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <h1 style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:1px;">${cfg.app_name}</h1>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:6px;">
                  <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#bbf7d0;">${cfg.app_slogan}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- ACCENT LINE -->
        <tr><td style="background-color:#15803d;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- BODY -->
        <tr>
          <td style="background-color:#ffffff;padding:32px 28px;">
            ${content}
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="background-color:#f9fafb;padding:20px 28px;border-top:1px solid #e5e7eb;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#9ca3af;">&copy; ${year} ${cfg.app_name} &ndash; ${cfg.org_name}</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:8px;">
                  <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#d1d5db;">
                    <a href="${cfg.portal_url}" style="color:#166534;text-decoration:none;">${cfg.portal_url}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function resetPasswordTemplate(nome, resetUrl) {
  const cfg = await getConfig();
  return emailLayout(`
    <p style="margin:0 0 16px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
      Ciao <strong style="color:#111827;">${nome}</strong>,
    </p>
    <p style="margin:0 0 24px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
      Hai richiesto il ripristino della password del tuo account ${cfg.app_name}. Clicca il pulsante qui sotto per impostare una nuova password:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td align="center" style="padding:8px 0 28px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="15%" stroke="f" fillcolor="#166534">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:15px;font-weight:bold;">Reimposta Password</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!---->
        <a href="${resetUrl}" style="display:inline-block;background-color:#166534;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;">Reimposta Password</a>
        <!--<![endif]-->
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e5e7eb;">
      <tr><td style="padding:20px 0 0;">
        <p style="margin:0 0 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.5;">
          <strong>Il link &egrave; valido per 1 ora.</strong> Se non hai richiesto tu il ripristino, ignora questa email.
        </p>
        <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#9ca3af;line-height:1.5;">
          Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
          <a href="${resetUrl}" style="color:#166534;word-break:break-all;font-size:12px;">${resetUrl}</a>
        </p>
      </td></tr>
    </table>
  `);
}

async function notificaTemplate(nome, titolo, messaggio) {
  const cfg = await getConfig();
  return emailLayout(`
    <p style="margin:0 0 16px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
      Ciao <strong style="color:#111827;">${nome}</strong>,
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#f0fdf4;border-left:4px solid #166534;padding:16px 20px;">
          <h2 style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:17px;font-weight:600;color:#166534;">${titolo}</h2>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">${messaggio}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
      <tr><td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${cfg.portal_url}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="15%" stroke="f" fillcolor="#166534">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:14px;font-weight:bold;">Vai al Portale</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!---->
        <a href="${cfg.portal_url}" style="display:inline-block;background-color:#166534;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:6px;">Vai al Portale</a>
        <!--<![endif]-->
      </td></tr>
    </table>
  `);
}

module.exports = { sendMail, resetPasswordTemplate, notificaTemplate, transporter };
