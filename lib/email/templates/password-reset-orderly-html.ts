/**
 * Passwort-zurücksetzen-Mail im OrderlyEmails-/Shopify-ähnlichen Layout (600px, weiße Karte).
 */
export function buildPasswordResetOrderlyHtml(): string {
  const pageBg = "#f9f9f9";
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif";
  const headingColor = "#666666";
  const bodyColor = "#777777";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Passwort zurücksetzen — {{shop.name}}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { -ms-interpolation-mode: bicubic; border: 0 !important; outline: none !important; text-decoration: none !important; }
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; min-width: 100% !important; }
      .section-pad { padding-left: 22px !important; padding-right: 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${pageBg};width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <div style="display:none;overflow:hidden;line-height:1px;max-height:0;max-width:0;opacity:0;mso-hide:all;">
    Du hast darum gebeten, dass das Passwort für dein Konto zurückgesetzt wird. Bitte bestätige deine Anfrage.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${pageBg};min-width:100%;" bgcolor="${pageBg}">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" align="center" style="width:600px;min-width:600px;max-width:600px;margin:0 auto;">

          <!-- HEADER: Logo -->
          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;padding:22px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" align="center" style="padding:11px 44px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      {{{shop.logo_html}}}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN -->
          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;">

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:22px 44px 11px;font-family:${font};" align="center">
                    <h1 style="margin:0;font-size:28px;line-height:1.4;font-weight:400;color:${headingColor};">Dein Passwort zurücksetzen</h1>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};" align="center">
                    {{{customer.greeting_html}}}
                    <p style="margin:0;">du hast darum gebeten, dass das Passwort für dein Konto zurückgesetzt wird. Bitte bestätige deine Anfrage.</p>
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:0 44px 44px;font-family:${font};" align="center">
                    {{{email.cta_html}}}
                    {{{email.after_button_note_html}}}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:0;">
              {{{shop.footer_html}}}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
