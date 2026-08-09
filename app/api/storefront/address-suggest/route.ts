import { NextResponse, type NextRequest } from "next/server";
import {
  isAddressSuggestCountry,
  type AddressSuggestResponse,
} from "@/lib/address/address-suggest-shared";
import {
  suggestLocalitiesByPostalCode,
  suggestStreets,
} from "@/lib/address/openplz-address-suggest";
import {
  addressSuggestRateLimitHeaders,
  touchAddressSuggestApiAttempt,
} from "@/lib/security/address-suggest-api-rate-limit";
import { clientIpFromRequest } from "@/lib/security/client-ip";

const EMPTY: AddressSuggestResponse = { localities: [], streets: [] };

export async function GET(req: NextRequest) {
  const limited = touchAddressSuggestApiAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte kurz warten." },
      { status: 429, headers: addressSuggestRateLimitHeaders(limited.retryAfterSec) },
    );
  }

  const sp = req.nextUrl.searchParams;
  const country = (sp.get("land") ?? "").trim().toUpperCase();
  if (!isAddressSuggestCountry(country)) {
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "private, no-store" } });
  }

  const zip = (sp.get("plz") ?? "").trim();
  const city = (sp.get("ort") ?? "").trim();
  const street = (sp.get("strasse") ?? "").trim();

  try {
    const body: AddressSuggestResponse = street
      ? {
          localities: [],
          streets: await suggestStreets({
            countryCode: country,
            query: street,
            postalCode: zip,
            city,
          }),
        }
      : { localities: await suggestLocalitiesByPostalCode(country, zip), streets: [] };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=86400" },
    });
  } catch {
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "private, no-store" } });
  }
}
