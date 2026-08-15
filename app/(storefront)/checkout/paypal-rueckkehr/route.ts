import { NextResponse } from "next/server";
import { completePayPalCaptureFlow } from "@/lib/checkout/complete-paypal-capture-flow";
import {
  appendCheckoutFormDraftCookie,
  loadCheckoutFormDraftForPayPalOrder,
} from "@/lib/checkout/checkout-form-draft-cookie";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

export async function GET(req: Request) {
  const origin = canonicalSiteOrigin().replace(/\/$/, "") || new URL(req.url).origin;
  const fail = async (code: string, token?: string | null) => {
    const res = NextResponse.redirect(`${origin}/checkout?paypal=${encodeURIComponent(code)}`);
    if (token) {
      const draft = await loadCheckoutFormDraftForPayPalOrder(token);
      if (draft) appendCheckoutFormDraftCookie(res, draft);
    }
    return res;
  };

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token?.trim()) {
    return fail("fehlt");
  }

  const r = await completePayPalCaptureFlow(token.trim(), { eventSource: "paypal_return" });

  if (!r.ok) {
    const { code } = r;
    if (code === "capture") return fail("capture", token);
    if (code === "bestellung") return fail("bestellung", token);
    if (code === "betrag") return fail("betrag", token);
    if (code === "finalisierung") return fail("finalisierung", token);
    return fail("finalisierung", token);
  }

  return NextResponse.redirect(`${origin}/checkout/erfolg?nr=${encodeURIComponent(r.orderNumber)}`);
}
