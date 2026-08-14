/**
 * Bestellbestätigung im OrderlyEmails-/Shopify-ähnlichen Layout (600px, weiße Karte).
 * Logo, Footer, CTA und Produktbilder werden zur Laufzeit über Template-Variablen injiziert.
 */
export function buildOrderConfirmationOrderlyHtml(): string {
  const pageBg = "#f9f9f9";
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif";
  const headingColor = "#666666";
  const bodyColor = "#777777";
  const dividerColor = "#eeeeee";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Bestellbestätigung {{order.number}}</title>
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
    Wir haben deine Bestellung {{order.number}} erhalten und bereiten sie für den Versand vor.
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

              <!-- Heading -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:22px 44px 11px;font-family:${font};" align="center">
                    <h1 style="margin:0;font-size:28px;line-height:1.4;font-weight:400;color:${headingColor};">Danke für deine Bestellung</h1>
                  </td>
                </tr>
              </table>

              <!-- Introduction -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};" align="center">
                    <p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p>
                    <p style="margin:0 0 11px;">wir haben deine Bestellung erhalten und bereiten diese nun für den Versand vor. Du erhältst eine weitere Nachricht von uns, sobald wir deine Bestellung verpackt haben.</p>
                    <p style="margin:0;">Hier sind die Details deiner Bestellung.</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:22px 44px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="border-top:1px solid ${dividerColor};font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order number -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px;font-family:${font};" align="center">
                    <h2 style="margin:0;font-size:20px;line-height:1.3;font-weight:400;color:${headingColor};">Bestell-Nr. {{order.number}}</h2>
                  </td>
                </tr>
              </table>

              <!-- Line items + totals -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px;font-family:${font};color:#333333;">
                    {{{order.items_html}}}
                    {{{order.totals_html}}}
                  </td>
                </tr>
              </table>

              <!-- Payment info -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px;font-family:${font};" align="left">
                    <h3 style="margin:0 0 12px;font-size:16px;line-height:1.4;font-weight:400;color:${headingColor};border-bottom:1px solid ${dividerColor};padding-bottom:8px;">Zahlungsinformationen</h3>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:15px;color:${bodyColor};">
                      <tr>
                        <td style="padding:5px 0;width:65%;" align="left">Zahlungsart</td>
                        <td style="padding:5px 0;width:35%;" align="right">{{order.payment_method}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Addresses -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px;">
                    {{{order.addresses_html}}}
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:22px 44px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="border-top:1px solid ${dividerColor};font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};" align="center">
                    <p style="margin:0 0 16px;">Du kannst hier den Status deiner Bestellung verfolgen:</p>
                    {{{email.cta_html}}}
                  </td>
                </tr>
              </table>

              <!-- Closing -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="section-pad" style="padding:11px 44px 44px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};" align="center">
                    <p style="margin:0;">Du hast Fragen zu deiner Bestellung? Dann nutze bitte die Kontaktdaten im Impressum.</p>
                    <p style="margin:16px 0 0;color:${headingColor};">Liebe Grüße<br/>{{shop.name}}</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER (Shop-USPs, Instagram, Rechtliches) -->
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
