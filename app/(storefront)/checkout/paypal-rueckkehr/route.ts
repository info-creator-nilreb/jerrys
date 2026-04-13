import { NextResponse } from "next/server";
import { completePayPalCaptureFlow } from "@/lib/checkout/complete-paypal-capture-flow";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

export async function GET(req: Request) {
  const origin = canonicalSiteOrigin().replace(/\/$/, "") || new URL(req.url).origin;
  const fail = (code: string) => NextResponse.redirect(`${origin}/checkout?paypal=${encodeURIComponent(code)}`);

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token?.trim()) {
    return fail("fehlt");
  }

  const r = await completePayPalCaptureFlow(token.trim(), { eventSource: "paypal_return" });

  if (!r.ok) {
    const { code } = r;
    if (code === "capture") return fail("capture");
    if (code === "bestellung") return fail("bestellung");
    if (code === "betrag") return fail("betrag");
    if (code === "finalisierung") return fail("finalisierung");
    return fail("finalisierung");
  }

  return NextResponse.redirect(`${origin}/checkout/erfolg?nr=${encodeURIComponent(r.orderNumber)}`);
}
