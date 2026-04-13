import { NextResponse } from "next/server";
import {
  createPendingPayPalOrderFromFormData,
  createPendingPayPalOrderFromJsonBody,
} from "@/lib/checkout/create-pending-paypal-order-from-form";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";

export async function POST(req: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { ok: false, error: "PayPal ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  let result: Awaited<ReturnType<typeof createPendingPayPalOrderFromFormData>>;

  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const fd = await req.formData();
    result = await createPendingPayPalOrderFromFormData(fd);
  } else if (ct.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
    }
    result = await createPendingPayPalOrderFromJsonBody(body);
  } else {
    return NextResponse.json(
      { ok: false, error: "Content-Type muss FormData oder application/json sein." },
      { status: 415 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, fieldErrors: result.fieldErrors },
      { status: 400 },
    );
  }

  if (!result.paymentReady) {
    return NextResponse.json(
      {
        ok: false,
        alreadyComplete: true,
        orderNumber: result.orderNumber,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    paypalOrderId: result.paypalOrderId,
    orderNumber: result.orderNumber,
  });
}
