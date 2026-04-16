import { handlers } from "@/auth";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  credentialSignInRateLimitHeaders,
  touchCredentialSignInAttempt,
} from "@/lib/security/sign-in-rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.includes("/callback/credentials")) {
    const limited = touchCredentialSignInAttempt(clientIpFromRequest(req));
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
