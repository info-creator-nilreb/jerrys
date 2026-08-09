import { sendTransactionalEmail } from "@/lib/email/provider";
import {
  grayInfoCard,
  wrapTransactionalEmailHtml,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";
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
  const greeting = input.contactName?.trim() || "du";
  const when = formatWorkshopSessionDateTime(input.preferredStartsAt, "Europe/Berlin");
  const seats =
    input.seatCount === 1 ? "1 Platz" : `${input.seatCount} Plätze`;
  const overviewUrl = termineOverviewUrl();

  const subject = "Dein Wunschtermin wurde angenommen";

  const text = [
    `Hallo ${greeting},`,
    "",
    "wir haben deine Terminanfrage angenommen und einen Terminentwurf angelegt.",
    "",
    `Wunschzeit: ${when}`,
    `Plätze: ${seats}`,
    "",
    "Sobald der Termin veröffentlicht ist, kannst du ihn unter „Termine“ buchen.",
    "",
    overviewUrl,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const bodyInner = grayInfoCard(
    [
      `<p style="margin:0"><strong>Wunschzeit:</strong> ${escapeHtmlForEmail(when)}</p>`,
      `<p style="margin:8px 0 0"><strong>Plätze:</strong> ${escapeHtmlForEmail(seats)}</p>`,
      `<p style="margin:12px 0 0;font-size:13px;color:#5c5c5c">Der Termin wird noch finalisiert und anschließend im Shop sichtbar geschaltet.</p>`,
    ].join(""),
  );

  const html = wrapTransactionalEmailHtml({
    variant: "workshop",
    documentTitle: subject,
    heading: "Wunschtermin angenommen",
    intro: "Danke für deine Anfrage — wir melden uns, sobald der Termin buchbar ist.",
    bodyHtml: bodyInner,
    cta: { href: overviewUrl, label: "Termine ansehen" },
  });

  try {
    await sendTransactionalEmail({
      to: input.contactEmail,
      subject,
      text,
      html,
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
  const greeting = input.contactName?.trim() || "du";
  const when = formatWorkshopSessionDateTime(input.preferredStartsAt, "Europe/Berlin");
  const overviewUrl = termineOverviewUrl();

  const subject = "Zu deiner Terminanfrage";

  const noteBlock = input.adminNote?.trim()
    ? ["", "Hinweis vom Team:", input.adminNote.trim(), ""]
    : [""];

  const text = [
    `Hallo ${greeting},`,
    "",
    "leider können wir deinen Wunschtermin so nicht anbieten.",
    "",
    `Angefragte Zeit: ${when}`,
    ...noteBlock,
    "Du kannst jederzeit eine neue Anfrage stellen oder einen veröffentlichten Termin buchen.",
    "",
    overviewUrl,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const noteHtml = input.adminNote?.trim()
    ? `<p style="margin:12px 0 0;padding:12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb"><strong>Hinweis:</strong> ${escapeHtmlForEmail(input.adminNote.trim())}</p>`
    : "";

  const bodyInner = grayInfoCard(
    [
      `<p style="margin:0"><strong>Angefragte Zeit:</strong> ${escapeHtmlForEmail(when)}</p>`,
      noteHtml,
    ].join(""),
  );

  const html = wrapTransactionalEmailHtml({
    variant: "workshop",
    documentTitle: subject,
    heading: "Terminanfrage nicht möglich",
    intro: "Schau gern in unserem Terminkalender nach Alternativen oder stelle eine neue Anfrage.",
    bodyHtml: bodyInner,
    cta: { href: overviewUrl, label: "Termine ansehen" },
  });

  try {
    await sendTransactionalEmail({
      to: input.contactEmail,
      subject,
      text,
      html,
    });
  } catch (e) {
    log.warn("workshop_date_request_rejected_email_failed", {
      error: String(e),
    });
  }
}
