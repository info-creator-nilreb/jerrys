import { applePayDomainAssociationBody } from "@/lib/payments/apple-pay-domain-association";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apple verlangt die Domain-Association ohne Redirect und als Binärdownload
 * (`application/octet-stream`) unter exakt diesem Pfad.
 * @see https://developer.paypal.com/docs/checkout/apm/apple-pay/
 */
export async function GET() {
  try {
    const body = applePayDomainAssociationBody();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
        // Keine Content-Disposition — Apple holt den Body direkt.
      },
    });
  } catch (e) {
    console.error("[apple-pay-domain-association]", e);
    return new Response("Apple Pay domain association unavailable", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
