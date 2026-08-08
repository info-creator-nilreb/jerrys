import { NextResponse, type NextRequest } from "next/server";
import { listStorefrontProductSuggestions } from "@/lib/catalog/storefront-product-suggest";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  storefrontSearchApiRateLimitJsonHeaders,
  touchStorefrontSearchApiAttempt,
} from "@/lib/security/storefront-search-api-rate-limit";

export async function GET(req: NextRequest) {
  const limited = touchStorefrontSearchApiAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte kurz warten." },
      { status: 429, headers: storefrontSearchApiRateLimitJsonHeaders(limited.retryAfterSec) },
    );
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";

  try {
    const suggestions = await listStorefrontProductSuggestions(q);
    return NextResponse.json(
      { suggestions },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    if (isDatabaseUnreachable(e)) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }
    return NextResponse.json({ error: "Suche fehlgeschlagen" }, { status: 500 });
  }
}
