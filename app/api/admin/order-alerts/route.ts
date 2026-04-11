import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { listOrdersCreatedAfter } from "@/lib/admin/order-alerts";

export async function GET(req: NextRequest) {
  const session = await auth();
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
    const orders = await listOrdersCreatedAfter(since);
    return NextResponse.json({ orders, count: orders.length });
  } catch {
    return NextResponse.json({ error: "Laden fehlgeschlagen" }, { status: 500 });
  }
}
