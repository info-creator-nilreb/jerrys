import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { listOrdersCreatedAfter } from "@/lib/admin/order-alerts";
import {
  listWorkshopBookingsConfirmedAfter,
  listWorkshopDateRequestsCreatedAfter,
} from "@/lib/admin/workshop-alerts";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const sinceRaw = req.nextUrl.searchParams.get("since");
  if (!sinceRaw) {
    return NextResponse.json({ error: "Parameter since fehlt" }, { status: 400 });
  }

  const since = new Date(sinceRaw);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });
  }

  try {
    const [orders, bookings, dateRequests] = await Promise.all([
      listOrdersCreatedAfter(since),
      listWorkshopBookingsConfirmedAfter(since),
      listWorkshopDateRequestsCreatedAfter(since),
    ]);
    const count = orders.length + bookings.length + dateRequests.length;
    return NextResponse.json({ orders, bookings, dateRequests, count });
  } catch {
    return NextResponse.json({ error: "Laden fehlgeschlagen" }, { status: 500 });
  }
}
