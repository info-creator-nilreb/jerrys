import type { EmailTemplateKey } from "@/lib/email/templates/catalog";
import { grayInfoCard } from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail } from "@/lib/email/template-utils";

const PREVIEW = {
  title: "Gin Tasting",
  when: "Sa., 20.09.2026, 18:00",
  location: "jerry's Bar, Berlin",
  seats: "2 Plätze",
  price: "79,00 €",
  adminNote: "Leider keine Kapazität an diesem Tag.",
};

function confirmationDetailsHtml(): string {
  return grayInfoCard(
    [
      `<strong style="font-size:16px;color:#1f2937">${escapeHtmlForEmail(PREVIEW.title)}</strong>`,
      `<p style="margin:12px 0 0">${escapeHtmlForEmail(PREVIEW.when)}</p>`,
      `<p style="margin:8px 0 0"><strong>Ort:</strong> ${escapeHtmlForEmail(PREVIEW.location)}</p>`,
      `<p style="margin:8px 0 0"><strong>Plätze:</strong> ${escapeHtmlForEmail(PREVIEW.seats)}</p>`,
      `<p style="margin:8px 0 0"><strong>Preis:</strong> ${escapeHtmlForEmail(PREVIEW.price)}</p>`,
    ].join(""),
  );
}

function cancelledDetailsHtml(): string {
  return grayInfoCard(
    [
      `<strong style="font-size:16px;color:#1f2937">${escapeHtmlForEmail(PREVIEW.title)}</strong>`,
      `<p style="margin:12px 0 0">${escapeHtmlForEmail(PREVIEW.when)}</p>`,
      `<p style="margin:8px 0 0"><strong>Ort:</strong> ${escapeHtmlForEmail(PREVIEW.location)}</p>`,
      `<p style="margin:12px 0 0;font-size:13px;color:#5c5c5c">Bei kostenpflichtigen Buchungen bearbeiten wir Erstattungen gesondert, sofern eine Zahlung erfolgt ist.</p>`,
    ].join(""),
  );
}

function dateRequestApprovedDetailsHtml(): string {
  return grayInfoCard(
    [
      `<p style="margin:0"><strong>Wunschzeit:</strong> ${escapeHtmlForEmail(PREVIEW.when)}</p>`,
      `<p style="margin:8px 0 0"><strong>Plätze:</strong> ${escapeHtmlForEmail(PREVIEW.seats)}</p>`,
      `<p style="margin:12px 0 0;font-size:13px;color:#5c5c5c">Der Termin wird noch finalisiert und anschließend im Shop sichtbar geschaltet.</p>`,
    ].join(""),
  );
}

function dateRequestRejectedDetailsHtml(): string {
  return grayInfoCard(
    [
      `<p style="margin:0"><strong>Angefragte Zeit:</strong> ${escapeHtmlForEmail(PREVIEW.when)}</p>`,
      `<p style="margin:12px 0 0;padding:12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb"><strong>Hinweis:</strong> ${escapeHtmlForEmail(PREVIEW.adminNote)}</p>`,
    ].join(""),
  );
}

/** Workshop-Fragmente für Admin-Vorschau — identisch zu den echten Sendern. */
export function buildPreviewWorkshopFragments(key: EmailTemplateKey) {
  switch (key) {
    case "workshop_booking_confirmation":
      return {
        title: PREVIEW.title,
        when: PREVIEW.when,
        location: PREVIEW.location,
        seats: PREVIEW.seats,
        price: PREVIEW.price,
        details_html: confirmationDetailsHtml(),
      };
    case "workshop_booking_cancelled":
      return {
        title: PREVIEW.title,
        when: PREVIEW.when,
        location: PREVIEW.location,
        details_html: cancelledDetailsHtml(),
      };
    case "workshop_date_request_approved":
      return {
        when: PREVIEW.when,
        seats: PREVIEW.seats,
        details_html: dateRequestApprovedDetailsHtml(),
      };
    case "workshop_date_request_rejected":
      return {
        when: PREVIEW.when,
        admin_note: PREVIEW.adminNote,
        details_html: dateRequestRejectedDetailsHtml(),
      };
    default:
      return null;
  }
}
