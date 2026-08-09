import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import {
  EMAIL_WORKSHOP_BOOKING_CANCELLED,
  EMAIL_WORKSHOP_BOOKING_CONFIRMATION,
} from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import {
  grayInfoCard,
  wrapTransactionalEmailHtml,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";
import {
  buildWorkshopBookingIcs,
  type WorkshopBookingIcalInput,
} from "@/lib/workshop/workshop-booking-ical";

type BookingEmailRow = {
  id: string;
  orderId: string | null;
  contactEmail: string;
  seatCount: number;
  status: string;
  sessionTitleSnapshot: string;
  sessionStartsAtSnapshot: Date;
  sessionTimezoneSnapshot: string;
  sessionLocationSnapshot: string;
  unitPriceCentsSnapshot: number;
  currencySnapshot: string;
  session: { endsAt: Date };
};

async function loadBookingByOrderId(orderId: string): Promise<BookingEmailRow | null> {
  const prisma = getPrisma();
  return prisma.workshopBooking.findFirst({
    where: { orderId },
    select: {
      id: true,
      orderId: true,
      contactEmail: true,
      seatCount: true,
      status: true,
      sessionTitleSnapshot: true,
      sessionStartsAtSnapshot: true,
      sessionTimezoneSnapshot: true,
      sessionLocationSnapshot: true,
      unitPriceCentsSnapshot: true,
      currencySnapshot: true,
      session: { select: { endsAt: true } },
    },
  });
}

async function loadBookingById(bookingId: string): Promise<BookingEmailRow | null> {
  const prisma = getPrisma();
  return prisma.workshopBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      orderId: true,
      contactEmail: true,
      seatCount: true,
      status: true,
      sessionTitleSnapshot: true,
      sessionStartsAtSnapshot: true,
      sessionTimezoneSnapshot: true,
      sessionLocationSnapshot: true,
      unitPriceCentsSnapshot: true,
      currencySnapshot: true,
      session: { select: { endsAt: true } },
    },
  });
}

function icalInputFromRow(row: BookingEmailRow): WorkshopBookingIcalInput {
  const seats =
    row.seatCount === 1 ? "1 Platz" : `${row.seatCount} Plätze`;
  return {
    bookingId: row.id,
    title: row.sessionTitleSnapshot,
    startsAt: row.sessionStartsAtSnapshot,
    endsAt: row.session.endsAt,
    timezone: row.sessionTimezoneSnapshot,
    location: row.sessionLocationSnapshot,
    description: `${seats} · ${row.sessionLocationSnapshot}`,
  };
}

function icsAttachment(row: BookingEmailRow) {
  const ics = buildWorkshopBookingIcs(icalInputFromRow(row));
  return {
    filename: "jerrys-workshop.ics",
    content: Buffer.from(ics, "utf-8"),
    contentType: "text/calendar; charset=utf-8",
  };
}

function bookingDetailPath(bookingId: string): string {
  return `/konto/termine/${encodeURIComponent(bookingId)}`;
}

function bookingDetailUrl(bookingId: string): string {
  const base = publicSiteBaseUrl();
  const path = bookingDetailPath(bookingId);
  return base ? `${base}${path}` : path;
}

function calendarDownloadPath(bookingId: string): string {
  return `/konto/termine/${encodeURIComponent(bookingId)}/calendar`;
}

function buildConfirmationBodies(
  row: BookingEmailRow,
  greetingName: string,
): { subject: string; text: string; html: string } {
  const when = formatWorkshopSessionDateTime(
    row.sessionStartsAtSnapshot,
    row.sessionTimezoneSnapshot,
  );
  const seats =
    row.seatCount === 1 ? "1 Platz" : `${row.seatCount} Plätze`;
  const priceLine =
    row.unitPriceCentsSnapshot > 0
      ? formatPrice(row.unitPriceCentsSnapshot * row.seatCount, row.currencySnapshot)
      : "Kostenlos";

  const detailUrl = bookingDetailUrl(row.id);
  const subject = `Terminbestätigung: ${row.sessionTitleSnapshot}`;

  const text = [
    `Hallo ${greetingName},`,
    "",
    "dein Workshop-Termin bei jerry's ist bestätigt.",
    "",
    row.sessionTitleSnapshot,
    when,
    `Ort: ${row.sessionLocationSnapshot}`,
    `Plätze: ${seats}`,
    `Preis: ${priceLine}`,
    "",
    "Im Anhang findest du einen Kalendereintrag (.ics).",
    "",
    `Termin im Konto: ${detailUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const bodyInner = grayInfoCard(
    [
      `<strong style="font-size:16px;color:#1f2937">${escapeHtmlForEmail(row.sessionTitleSnapshot)}</strong>`,
      `<p style="margin:12px 0 0">${escapeHtmlForEmail(when)}</p>`,
      `<p style="margin:8px 0 0"><strong>Ort:</strong> ${escapeHtmlForEmail(row.sessionLocationSnapshot)}</p>`,
      `<p style="margin:8px 0 0"><strong>Plätze:</strong> ${escapeHtmlForEmail(seats)}</p>`,
      `<p style="margin:8px 0 0"><strong>Preis:</strong> ${escapeHtmlForEmail(priceLine)}</p>`,
    ].join(""),
  );

  const html = wrapTransactionalEmailHtml({
    variant: "workshop",
    documentTitle: subject,
    heading: "Dein Termin ist bestätigt",
    intro: "Wir freuen uns auf dich — speichere den Termin am besten direkt in deinem Kalender.",
    bodyHtml: bodyInner,
    cta: { href: detailUrl, label: "Termin im Konto ansehen" },
  });

  return { subject, text, html };
}

function buildCancellationBodies(
  row: BookingEmailRow,
  greetingName: string,
): { subject: string; text: string; html: string } {
  const when = formatWorkshopSessionDateTime(
    row.sessionStartsAtSnapshot,
    row.sessionTimezoneSnapshot,
  );
  const termineUrl = (() => {
    const base = publicSiteBaseUrl();
    const path = "/konto/termine";
    return base ? `${base}${path}` : path;
  })();

  const subject = `Termin storniert: ${row.sessionTitleSnapshot}`;

  const text = [
    `Hallo ${greetingName},`,
    "",
    "deine Workshop-Buchung wurde storniert.",
    "",
    row.sessionTitleSnapshot,
    when,
    `Ort: ${row.sessionLocationSnapshot}`,
    "",
    "Bei kostenpflichtigen Buchungen bearbeiten wir Erstattungen gesondert, sofern eine Zahlung erfolgt ist.",
    "",
    `Weitere Termine: ${termineUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const bodyInner = grayInfoCard(
    [
      `<strong style="font-size:16px;color:#1f2937">${escapeHtmlForEmail(row.sessionTitleSnapshot)}</strong>`,
      `<p style="margin:12px 0 0">${escapeHtmlForEmail(when)}</p>`,
      `<p style="margin:8px 0 0"><strong>Ort:</strong> ${escapeHtmlForEmail(row.sessionLocationSnapshot)}</p>`,
      `<p style="margin:12px 0 0;font-size:13px;color:#5c5c5c">Bei kostenpflichtigen Buchungen bearbeiten wir Erstattungen gesondert, sofern eine Zahlung erfolgt ist.</p>`,
    ].join(""),
  );

  const html = wrapTransactionalEmailHtml({
    variant: "workshop",
    documentTitle: subject,
    heading: "Termin storniert",
    intro: "Deine Buchung ist nicht mehr aktiv. Wir hoffen, dich bald bei einem anderen Termin zu sehen.",
    bodyHtml: bodyInner,
    cta: { href: termineUrl, label: "Termine im Konto" },
  });

  return { subject, text, html };
}

async function resolveGreetingName(orderId: string | null, contactEmail: string): Promise<string> {
  if (!orderId) return "du";
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    select: { shippingFirstName: true },
  });
  const name = order?.shippingFirstName?.trim();
  return name || contactEmail.split("@")[0] || "du";
}

/**
 * Terminbestätigung mit iCal-Anhang — höchstens einmal erfolgreich pro Bestellung (`email_logs`).
 */
export async function sendWorkshopBookingConfirmationIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(
    prisma,
    orderId,
    EMAIL_WORKSHOP_BOOKING_CONFIRMATION,
  );
  if (!options?.force && isOrderEmailAlreadySentSuccessfully(existing)) return;

  const row = await loadBookingByOrderId(orderId);
  if (!row || row.status !== "confirmed") return;

  const greetingName = await resolveGreetingName(row.orderId, row.contactEmail);
  const { subject, text, html } = buildConfirmationBodies(row, greetingName);

  let result: Awaited<ReturnType<typeof sendTransactionalEmail>>;
  try {
    result = await sendTransactionalEmail({
      to: row.contactEmail,
      subject,
      text,
      html,
      attachments: [icsAttachment(row)],
    });
  } catch (e) {
    result = {
      status: "failed",
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }

  await upsertOrderEmailDeliveryLog(prisma, {
    orderId,
    emailType: EMAIL_WORKSHOP_BOOKING_CONFIRMATION,
    toEmail: row.contactEmail,
    result,
  });
}

/**
 * Storno-Mail nach Selbststornierung. Mit `orderId` Dedupe über `email_logs`.
 */
export async function sendWorkshopBookingCancelledForBookingId(
  bookingId: string,
): Promise<void> {
  const row = await loadBookingById(bookingId);
  if (!row || row.status !== "cancelled") return;

  const prisma = getPrisma();
  if (row.orderId) {
    const existing = await findOrderEmailLog(
      prisma,
      row.orderId,
      EMAIL_WORKSHOP_BOOKING_CANCELLED,
    );
    if (isOrderEmailAlreadySentSuccessfully(existing)) return;
  }

  const greetingName = await resolveGreetingName(row.orderId, row.contactEmail);
  const { subject, text, html } = buildCancellationBodies(row, greetingName);

  let result: Awaited<ReturnType<typeof sendTransactionalEmail>>;
  try {
    result = await sendTransactionalEmail({
      to: row.contactEmail,
      subject,
      text,
      html,
    });
  } catch (e) {
    result = {
      status: "failed",
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }

  if (row.orderId) {
    await upsertOrderEmailDeliveryLog(prisma, {
      orderId: row.orderId,
      emailType: EMAIL_WORKSHOP_BOOKING_CANCELLED,
      toEmail: row.contactEmail,
      result,
    });
  }
}

/** ICS für authentifizierte Kundinnen/Kunden (Portal-Download). */
export async function buildWorkshopBookingIcsForCustomer(input: {
  customerId: string;
  bookingId: string;
}): Promise<{ filename: string; body: string } | null> {
  const row = await getPrisma().workshopBooking.findFirst({
    where: { id: input.bookingId, customerId: input.customerId, status: "confirmed" },
    select: {
      id: true,
      sessionTitleSnapshot: true,
      sessionStartsAtSnapshot: true,
      sessionTimezoneSnapshot: true,
      sessionLocationSnapshot: true,
      seatCount: true,
      session: { select: { endsAt: true } },
    },
  });
  if (!row) return null;

  const ics = buildWorkshopBookingIcs({
    bookingId: row.id,
    title: row.sessionTitleSnapshot,
    startsAt: row.sessionStartsAtSnapshot,
    endsAt: row.session.endsAt,
    timezone: row.sessionTimezoneSnapshot,
    location: row.sessionLocationSnapshot,
    description:
      row.seatCount === 1 ? "1 Platz" : `${row.seatCount} Plätze`,
  });

  return { filename: "jerrys-workshop.ics", body: ics };
}

export { calendarDownloadPath };
