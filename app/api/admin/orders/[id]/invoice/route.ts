import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildInvoicePdfBuffer } from "@/lib/invoice/build-invoice-pdf";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const order = await getPrisma().order.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  }
  if (!order.invoiceNumber) {
    return NextResponse.json({ error: "Noch keine Rechnung vorhanden" }, { status: 404 });
  }

  const buf = await buildInvoicePdfBuffer(order);
  const safeName = order.invoiceNumber.replace(/[^\w.-]+/g, "_");
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Rechnung_${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
