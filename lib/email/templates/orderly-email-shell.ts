/** Gemeinsame OrderlyEmails-/Shopify-ähnliche Hülle (600px, weiße Karte). */
export const ORDERLY_EMAIL_STYLE = {
  pageBg: "#f9f9f9",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif",
  headingColor: "#666666",
  bodyColor: "#777777",
  mutedColor: "#cccccc",
  dividerColor: "#eeeeee",
} as const;

export function buildOrderlyEmailHtml(input: {
  documentTitle: string;
  previewText: string;
  bodyHtml: string;
}): string {
  const { pageBg, font } = ORDERLY_EMAIL_STYLE;
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>${input.documentTitle}</title>
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
    ${input.previewText}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${pageBg};min-width:100%;" bgcolor="${pageBg}">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" align="center" style="width:600px;min-width:600px;max-width:600px;margin:0 auto;">

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

          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;font-family:${font};">
              ${input.bodyHtml}
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

export function orderlyHeading(title: string): string {
  const { font, headingColor } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:22px 44px 11px;font-family:${font};" align="center"><h1 style="margin:0;font-size:28px;line-height:1.4;font-weight:400;color:${headingColor};">${title}</h1></td></tr></table>`;
}

export function orderlyIntro(html: string): string {
  const { font, bodyColor } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:11px 44px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};" align="center">${html}</td></tr></table>`;
}

export function orderlyDivider(): string {
  const { dividerColor } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:22px 44px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-top:1px solid ${dividerColor};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr></table>`;
}

export function orderlyOrderNumber(numberLabel = "Bestell-Nr. {{order.number}}", dateHtml = ""): string {
  const { font, headingColor, mutedColor } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:11px 44px;font-family:${font};" align="center"><h2 style="margin:0;font-size:20px;line-height:1.3;font-weight:400;color:${headingColor};">${numberLabel}</h2>${dateHtml ? `<p style="margin:4px 0 0;font-size:13px;line-height:1.55;color:${mutedColor};">${dateHtml}</p>` : ""}</td></tr></table>`;
}

export function orderlyItemsSection(title: string, itemsVar: string, extraHtml = ""): string {
  const { font, headingColor, dividerColor } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:11px 44px;font-family:${font};color:#333333;"><h3 style="margin:0 0 12px;font-size:16px;line-height:1.4;font-weight:400;color:${headingColor};border-bottom:1px solid ${dividerColor};padding-bottom:8px;">${title}</h3>${itemsVar}${extraHtml}</td></tr></table>`;
}

export function orderlySection(html: string, padding = "11px 44px"): string {
  const { font } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:${padding};font-family:${font};">${html}</td></tr></table>`;
}

export function orderlyCtaBlock(introHtml: string): string {
  const { font, bodyColor } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:11px 44px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};" align="center">${introHtml}{{{email.cta_html}}}</td></tr></table>`;
}

export function orderlyAuthActionBlock(): string {
  const { font } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:0 44px 44px;font-family:${font};" align="center">{{{email.cta_html}}}{{{email.after_button_note_html}}}</td></tr></table>`;
}

export function orderlyClosing(): string {
  const { font, bodyColor, headingColor } = ORDERLY_EMAIL_STYLE;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="section-pad" style="padding:11px 44px 44px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};" align="center"><p style="margin:0;">Du hast Fragen zu deiner Bestellung? Dann nutze bitte die Kontaktdaten im Impressum.</p><p style="margin:16px 0 0;color:${headingColor};">Viele Grüße<br/>Dein {{shop.name}}-Team</p></td></tr></table>`;
}

export function orderlyWorkshopClosing(): string {
  return orderlyClosing().replace(
    "Du hast Fragen zu deiner Bestellung?",
    "Du hast Fragen zu deinem Termin?",
  );
}
