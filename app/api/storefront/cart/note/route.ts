import { NextResponse } from "next/server";
import { saveCartCustomerNote } from "@/lib/cart/save-cart-customer-note";

/** Notiz speichern ohne Server Action — kein RSC-Refresh der Warenkorb-Seite. */
export async function POST(request: Request) {
  let noteRaw = "";
  try {
    const body = (await request.json()) as { note?: unknown };
    noteRaw = typeof body.note === "string" ? body.note : String(body.note ?? "");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültige Anfrage." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const result = await saveCartCustomerNote(noteRaw);

  if (!result.ok) {
    const status = result.error === "Warenkorb nicht gefunden. Bitte Seite neu laden." ? 404 : 500;
    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
