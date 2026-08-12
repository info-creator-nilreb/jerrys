import { sendTransactionalEmail } from "@/lib/email/provider";
import { grayInfoCard } from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("email.workshop-date-request");

function termineOverviewUrl(): string {
  const base = publicSiteBaseUrl();
  const path = "/termine";
  return base ? `${base}${path}` : path;
}

export async function sendWorkshopDateRequestApprovedEmail(input: {
  contactEmail: string;
  contactName: string | null;
  preferredStartsAt: Date;
  seatCount: number;
  sessionId: string;
}): Promise<void> {
  const branding = await resolveTransactionalEmailBranding();
  const greeting = input.contactName?.trim() || "du";
  const when = formatWorkshopSessionDateTime(input.preferredStartsAt, "Europe/Berlin");
  const seats = input.seatCount === 1 ? "1 Platz" : `${input.seatCount} Plätze`;
  const overviewUrl = termineOverviewUrl();

  const detailsHtml = grayInfoCard(
    [
      `<p style="margin:0"><strong>Wunschzeit:</strong> ${escapeHtmlForEmail(when)}</p>`,
      `<p style="margin:8px 0 0"><strong>Plätze:</strong> ${escapeHtmlForEmail(seats)}</p>`,
      `<p style="margin:12px 0 0;font-size:13px;color:#5c5c5c">Der Termin wird noch finalisiert und anschließend im Shop sichtbar geschaltet.</p>`,
    ].join(""),
  );

  const vars = mergeTemplateVars(
    buildShopTemplateVars(branding, { href: overviewUrl, label: "Termine ansehen" }),
    {
      customer: { first_name: greeting },
      workshop: {
        when,
        seats,
        details_html: detailsHtml,
      },
    },
  );

  const rendered = await renderStoredEmailTemplate("workshop_date_request_approved", vars);
  if (!rendered.enabled) return;

  try {
    await sendTransactionalEmail({
      to: input.contactEmail,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  } catch (e) {
    log.warn("workshop_date_request_approved_email_failed", {
      sessionId: input.sessionId,
      error: String(e),
    });
  }
}

export async function sendWorkshopDateRequestRejectedEmail(input: {
  contactEmail: string;
  contactName: string | null;
  preferredStartsAt: Date;
  adminNote: string | null;
}): Promise<void> {
  const branding = await resolveTransactionalEmailBranding();
  const greeting = input.contactName?.trim() || "du";
  const when = formatWorkshopSessionDateTime(input.preferredStartsAt, "Europe/Berlin");
  const overviewUrl = termineOverviewUrl();
  const adminNote = input.adminNote?.trim() || "";

  const noteHtml = adminNote
    ? `<p style="margin:12px 0 0;padding:12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb"><strong>Hinweis:</strong> ${escapeHtmlForEmail(adminNote)}</p>`
    : "";

  const detailsHtml = grayInfoCard(
    [
      `<p style="margin:0"><strong>Angefragte Zeit:</strong> ${escapeHtmlForEmail(when)}</p>`,
      noteHtml,
    ].join(""),
  );

  const vars = mergeTemplateVars(
    buildShopTemplateVars(branding, { href: overviewUrl, label: "Termine ansehen" }),
    {
      customer: { first_name: greeting },
      workshop: {
        when,
        admin_note: adminNote,
        details_html: detailsHtml,
      },
    },
  );

  const rendered = await renderStoredEmailTemplate("workshop_date_request_rejected", vars);
  if (!rendered.enabled) return;

  try {
    await sendTransactionalEmail({
      to: input.contactEmail,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  } catch (e) {
    log.warn("workshop_date_request_rejected_email_failed", {
      error: String(e),
    });
  }
}
