import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  credentialSignInRateLimitHeaders,
  touchCredentialSignInAttempt,
} from "@/lib/security/sign-in-rate-limit";
import { touchCustomerLoginAttempt } from "@/lib/security/customer-auth-rate-limit";
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
  const secret = readAuthSecretRuntime();
  if (!secret) {
    log.error("auth_secret_missing_at_runtime", {
      envKeys: listAuthRelatedEnvKeys(),
    });
    return null;
  }
  const { handlers } = await import("@/auth");
  return handlers;
}

function misconfiguredAuthResponse() {
  return NextResponse.json(
    {
      error:
        "Auth nicht konfiguriert (AUTH_SECRET fehlt in dieser Deployment-Umgebung). Vercel: Environment Variables für Preview und Production setzen, dann Redeploy.",
    },
    { status: 503 },
  );
}

function isCredentialCallbackPath(path: string): boolean {
  return (
    path.includes("/callback/credentials") ||
    path.includes("/callback/customer-credentials") ||
    path.includes("/callback/customer-magic-link")
  );
}

function isCustomerCredentialCallbackPath(path: string): boolean {
  return (
    path.includes("/callback/customer-credentials") ||
    path.includes("/callback/customer-magic-link")
  );
}

export async function GET(req: NextRequest) {
  const handlers = await loadHandlers();
  if (!handlers) return misconfiguredAuthResponse();
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (isCredentialCallbackPath(path)) {
    const ip = clientIpFromRequest(req);
    if (isCustomerCredentialCallbackPath(path)) {
      const limited = touchCustomerLoginAttempt(ip);
      if (!limited.ok) {
        return NextResponse.json(
          { error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." },
          {
            status: 429,
            headers: credentialSignInRateLimitHeaders(limited.retryAfterSec),
          },
        );
      }
    } else {
      const limited = touchCredentialSignInAttempt(ip);
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
  }
  const handlers = await loadHandlers();
  if (!handlers) return misconfiguredAuthResponse();
  return handlers.POST(req);
}
