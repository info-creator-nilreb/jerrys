import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  credentialSignInRateLimitHeaders,
  touchCredentialSignInAttempt,
} from "@/lib/security/sign-in-rate-limit";
import {
  listAuthRelatedEnvKeys,
  readAuthSecretRuntime,
} from "@/lib/auth/read-auth-secret-runtime";
import { createLogger } from "@/lib/logging/logger";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("auth-route");

async function loadHandlers() {
  if (!readAuthSecretRuntime()) {
    log.error("auth_secret_missing_at_runtime", {
      envKeys: listAuthRelatedEnvKeys(),
    });
  }
  const { handlers } = await import("@/auth");
  return handlers;
}

export async function GET(req: NextRequest) {
  const handlers = await loadHandlers();
  return handlers.GET(req);
}

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
  const handlers = await loadHandlers();
  return handlers.POST(req);
}
