import { handlers } from "@/auth";
import {
  credentialSignInRateLimitHeaders,
  touchCredentialSignInAttempt,
} from "@/lib/security/sign-in-rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = handlers.GET;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.includes("/callback/credentials")) {
    const limited = touchCredentialSignInAttempt(clientIp(req));
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." },
        {
          status: 429,
          headers: credentialSignInRateLimitHeaders(limited.retryAfterSec),
        },
      );
    }
  }
  return handlers.POST(req);
}
