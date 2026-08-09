import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { buildWorkshopBookingIcsForCustomer } from "@/lib/email/workshop-booking-emails";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookingId: string }> },
) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { bookingId: raw } = await context.params;
  const bookingId = decodeURIComponent(raw ?? "").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "Ungültige Buchung." }, { status: 400 });
  }

  const ics = await buildWorkshopBookingIcsForCustomer({
    customerId: session.customerId,
    bookingId,
  });
  if (!ics) {
    return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  }

  return new NextResponse(ics.body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ics.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
