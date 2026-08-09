import { NextResponse } from "next/server";
import { exportCustomerData } from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { touchCustomerDataExportAttempt } from "@/lib/security/customer-privacy-rate-limit";
import { headers } from "next/headers";

/**
 * Datenauskunft als JSON-Download (Art. 15 DSGVO). Nur für die eigene, verifizierte Identität —
 * es gibt keinen Parameter für ein fremdes Konto.
 */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const limited = touchCustomerDataExportAttempt(clientIpFromHeaders(await headers()));
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const data = await exportCustomerData(session.customerId);
  if (!data) {
    return NextResponse.json(
      { error: "Export nur mit bestätigter E-Mail-Adresse möglich." },
      { status: 403 },
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jerrys-datenauskunft-${stamp}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
