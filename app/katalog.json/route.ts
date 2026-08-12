import { NextResponse, type NextRequest } from "next/server";
import { ifNoneMatchMatches, publicProductFeedEtag } from "@/features/catalog";
import { getPublicProductFeedDocument } from "@/features/catalog/server";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  publicCatalogFeedRateLimitHeaders,
  touchPublicCatalogFeedAttempt,
} from "@/lib/security/public-catalog-feed-rate-limit";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/**
 * Maschinenlesbarer öffentlicher Produktkatalog (Epic 14 Slice 4).
 * Nur aktive Produkte; Preis/Verfügbarkeit wie Storefront/JSON-LD — keine Lagermengen.
 */
export async function GET(req: NextRequest) {
  const limited = touchPublicCatalogFeedAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte Cache/ETag nutzen oder kurz warten." },
      {
        status: 429,
        headers: publicCatalogFeedRateLimitHeaders(limited.retryAfterSec),
      },
    );
  }

  try {
    const origin = canonicalSiteOrigin() || "https://example.com";
    const doc = await getPublicProductFeedDocument(origin);
    const body = JSON.stringify(doc);
    const etag = publicProductFeedEtag(doc);

    if (ifNoneMatchMatches(req.headers.get("if-none-match"), etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ETag: etag,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    if (isDatabaseUnreachable(e)) {
      return NextResponse.json(
        {
          version: 1,
          generatedAt: new Date().toISOString(),
          productCount: 0,
          products: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=60",
          },
        },
      );
    }
    return NextResponse.json(
      { error: "Katalogfeed nicht verfügbar" },
      { status: 500 },
    );
  }
}
